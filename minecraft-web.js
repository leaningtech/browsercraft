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
      aspect-ratio: 854 / 480;

      background: black;
      color: #eee;
      color-scheme: dark;

      width: 854px;
      height: 480px;
    }

    :host([hidden]) {
      display: none;
    }

    canvas {
      width: inherit;
      height: inherit;
    }

    .display {
      width: 854px;
      height: 480px;
      position: absolute;
      inset: 0;
      visibility: hidden;
    }

    .intro {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    p {
      max-width: 60ch;
    }

    .disclaimer {
      font-size: 0.8em;
      opacity: 0.5;
    }

    button {
      padding: 0.5em 1em;
      margin: 2em;
    }

    progress {
      width: calc(100% - 2em);
      margin: 1em;
    }

    *:focus {
      outline: none;
    }
  </style>
  <canvas width="854" height="480" tabindex="-1"></canvas>
  <div class="display"></div>
  <div class="intro">
    <p>
      This is a proof-of-concept demo of Minecraft 1.2.5 running unmodified in the browser.
    </p>
    <p>
      Clicking the button below will download the client from mojang.com.
      By clicking it, you agree to the <a href="https://www.minecraft.net/eula">Minecraft EULA</a>.
    </p>
    <button>Play!</button>
    <div class="disclaimer">
      This is not an official Minecraft product. It is not approved by or associated with Mojang or Microsoft.
    </div>
  </div>
  <progress style="display: none"></progress>
`;

export default class MinecraftClient extends HTMLElement {
  #canvas;
  #progress;
  #button;
  #display;
  #intro;
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
    this.#canvas.style.display = 'none';

    this.#progress = shadowRoot.querySelector('progress');
    this.#progress.style.display = 'none';

    this.#intro = shadowRoot.querySelector('.intro');

    // CheerpJ needs an element to render to, but we are going to render to own canvas
    this.#display = shadowRoot.querySelector('.display');
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

    this.#intro.style.display = 'none';
  
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
    this.#progress.style.display = 'none';
  
    this.#canvas.style.display = 'unset';
    window.lwjglCanvasElement = this.#canvas;
    const exitCode = await cheerpjRunMain("net.minecraft.client.Minecraft", `/app/lwjgl-2.9.0.jar:/app/lwjgl_util-2.9.0.jar:${jarPath}`)

    this.#canvas.style.display = 'none';
    this.#isRunning = false;

    return exitCode;
  }

  /** @returns {boolean} */
  get isRunning() {
    return this.#isRunning;
  }
}
