console.log(window.cheerpOSOpen)

/**
 * Downloads a file from a url and writes it to the CheerpJ filesystem.
 * @param {string} url
 * @param {string} destPath
 * @param {(downloadedBytes: number, totalBytes: number) => void} [progressCallback]
 * @returns {Promise<void>}
 */
async function downloadFileToCheerpJ(url, destPath, progressCallback) {
	const response = await fetch(url);
	const reader = response.body.getReader();
	const contentLength = +response.headers.get('Content-Length');

	const bytes = new Uint8Array(contentLength);
  progressCallback?.(0, contentLength);

	let pos = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done)
			break;
		bytes.set(value, pos);
		pos += value.length;
    progressCallback?.(pos, contentLength);
	}

	// Write to CheerpJ filesystem
	return new Promise((resolve, reject) => {
		cheerpOSOpen(cjFDs, destPath, "w", fd => {
			cheerpOSWrite(cjFDs, fd, bytes, 0, bytes.length, w => {
				cheerpOSClose(cjFDs, fd);
				resolve();
			});
		});
	});
}

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
    }

    :host([hidden]) {
      display: none;
    }
  </style>
  <canvas width="854" height="480" tabindex="-1"></canvas>
  <div data-display style="width:100%;height:100%;position:absolute;top:0;left:0px;visibility:hidden;"></div>
  <progress style="display: none"></progress>
  <button>Run</button>
`;

export default class MinecraftClient extends HTMLElement {
  #canvas;
  #progress;
  #button;
  #display;
  #isRunning;

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));

    this.#button = shadowRoot.querySelector('button');
    this.#button.addEventListener('click', () => this.run());

    this.#canvas = shadowRoot.querySelector('canvas');
    this.#canvas.width = 854;
    this.#canvas.height = 480;
    this.#canvas.tabIndex = -1;
    this.#canvas.style.visibility = 'hidden';

    this.#progress = shadowRoot.querySelector('progress');
    this.#progress.style.display = 'none';

    // CheerpJ needs a div to render to, but we are going to render to own canvas
    this.#display = shadowRoot.querySelector('div[data-display]');
    this.#display.setAttribute('style', 'width:100%;height:100%;position:absolute;top:0;left:0px;visibility:hidden;');
    cheerpjCreateDisplay(-1, -1, this.#display);

    this.#isRunning = false;
  }

  static register() {
    customElements.define('minecraft-client', this);
  }

  /** @returns {Promise<number>} Exit code */
  async run() {
    if (this.#isRunning) {
      throw new Error('Already running');
    }

    this.#button.style.display = 'none';
    this.#progress.style.display = 'unset';

    const jarPath = "/files/client_1.2.5.jar"
    await downloadFileToCheerpJ(
      "https://piston-data.mojang.com/v1/objects/4a2fac7504182a97dcbcd7560c6392d7c8139928/client.jar",
      jarPath,
      (downloadedBytes, totalBytes) => {
        this.#progress.value = downloadedBytes;
        this.#progress.max = totalBytes;
      }
    );
    this.#progress.remove();
    this.#canvas.style.visibility = 'unset';
    const exitCode = await cheerpjRunMain("net.minecraft.client.Minecraft", `/app/lwjgl-2.9.0.jar:/app/lwjgl_util-2.9.0.jar:${jarPath}`)

    this.#canvas.style.visibility = 'hidden';
    this.#isRunning = false;

    return exitCode;
  }

  /** @returns {boolean} */
  get isRunning() {
    return this.#isRunning;
  }
}
