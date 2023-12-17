async function installFile(url, destPath)
{
	var response = await fetch(url);
	var buf = await response.arrayBuffer();
	var bytes = new Uint8Array(buf);
	return new Promise(function(f, r)
	{
		cheerpOSOpen(cjFDs, destPath, "w", function(fd)
		{
			cheerpOSWrite(cjFDs, fd, bytes, 0, bytes.length, function(w)
			{
				cheerpOSClose(cjFDs, fd);
				f();
			});
		});
	});
}
