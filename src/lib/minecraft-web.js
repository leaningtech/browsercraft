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
	#progress;
	#button;
	#display;
	#intro;
	#timeout;
	#timer;
	#timerText
	#timeLeft;
	#timerInterval;
	#isRunning;

	constructor() {
		this.#button = document.querySelector('button');
		this.#button.addEventListener('click', () => this.run());

		this.#progress = document.querySelector('progress');
		this.#progress.style.display = 'none';

		this.#intro = document.querySelector('.intro');

		this.#timeout = document.querySelector('.timeout');
		this.#timer = document.querySelector('.timeout-timer');
		this.#timerText = document.getElementById('timer');

		// CheerpJ needs an element to render to
		this.#display = document.querySelector('.display');
		cheerpjCreateDisplay(-1, -1, this.#display);

		this.#isRunning = false;

		// The demo is limited to 3 minutes, and not intended to replace the full game
		this.#timeLeft = 180;
		this.updateTimer();
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

		this.#timer.style.display = 'unset';
		this.#timerInterval = setInterval(() => this.timerTick(), 1000);
	
		const exitCode = await cheerpjRunMain("net.minecraft.client.Minecraft", `/app/lwjgl/lwjgl-2.9.3.jar:/app/lwjgl/lwjgl_util-2.9.3.jar:${jarPath}`)

		this.#isRunning = false;

		return exitCode;
	}

	/** @returns {boolean} */
	get isRunning() {
		return this.#isRunning;
	}

	updateTimer() {
		const minutes = Math.floor(this.#timeLeft / 60);
		const seconds = this.#timeLeft % 60;
		this.#timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	timerTick() {
		if(this.#timeLeft == 0)
		{
	clearInterval(this.#timerInterval);
	this.#timer.style.display = 'none';
				this.#timeout.style.display = 'flex';
	document.exitPointerLock();
	document.activeElement.blur();
	return;
		}
		this.#timeLeft--;
		this.updateTimer();
	}
}
