export default class MinecraftClient {
	#jarPath;

	constructor() {
		this.#jarPath = "/files/client_1.2.5.jar";
	}
	/*
	* Downloads a file from a url and writes it to the CheerpJ filesystem.
	* @param {string} url
	* @param {(downloadedBytes: number, totalBytes: number) => void} [progressCallback]
	*/
	async downloadFileToCheerpJ(url, progressCallback) {
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
			cheerpOSOpen(fds, this.#jarPath, "w", fd => {
				cheerpOSWrite(fds, fd, bytes, 0, bytes.length, w => {
					cheerpOSClose(fds, fd, resolve);
				});
			});
		});
	}

	async run() {
		await cheerpjRunMain("net.minecraft.client.Minecraft", `/app/lwjgl/lwjgl-2.9.3.jar:/app/lwjgl/lwjgl_util-2.9.3.jar:${this.#jarPath}`)
	}
}
