var r = await fetch("/static/libraries/liblwjgl.so");
var buf = await r.arrayBuffer();
export default
{
	wasmModule: buf
}
