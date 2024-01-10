/**
 * @param {HTMLProgressElement} progressEl
 * @param {string} url
 * @param {string} destPath
 * @returns {Promise<void>}
 */
async function installFile(progressEl, url, destPath) {
	const response = await fetch(url);
	const reader = response.body.getReader();
	const contentLength = +response.headers.get('Content-Length');

	const bytes = new Uint8Array(contentLength);
	progressEl.max = contentLength;

	let pos = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done)
			break;
		bytes.set(value, pos);
		pos += value.length;
		progressEl.value += value.length;
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
