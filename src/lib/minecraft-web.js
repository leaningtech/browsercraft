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
		var fds = [];
		cheerpOSOpen(fds, destPath, "w", fd => {
			cheerpOSWrite(fds, fd, bytes, 0, bytes.length, w => {
				cheerpOSClose(fds, fd, resolve);
			});
		});
	});
}

export default class MinecraftClient {
  #canvas;
  #progress;
  #button;
  #display;
  #intro;
  #isRunning;

  constructor() {
    this.#button = document.querySelector('button');
    this.#button.addEventListener('click', () => this.run());

    this.#progress = document.querySelector('progress');
    this.#progress.style.display = 'none';

    this.#intro = document.querySelector('.intro');

    // CheerpJ needs an element to render to
    this.#display = document.querySelector('.display');
    cheerpjCreateDisplay(-1, -1, this.#display);

    this.#isRunning = false;
  }

  /** @returns {Promise<number>} Exit code */
  async run() {
    if (this.#isRunning) {
      throw new Error('Already running');
    }
    if(self.plausible)
      self.plausible("Play");

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
    this.#display.style.display = 'unset';
  
    const exitCode = await cheerpjRunMain("net.minecraft.client.Minecraft", `/app/lwjgl/lwjgl-2.9.3.jar:/app/lwjgl/lwjgl_util-2.9.3.jar:${jarPath}`)

    this.#isRunning = false;

    return exitCode;
  }

  /** @returns {boolean} */
  get isRunning() {
    return this.#isRunning;
  }
}
