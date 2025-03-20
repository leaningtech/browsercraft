var r = await fetch("/libraries/liblwjgl.so");
var buf = await r.arrayBuffer();
export default
{
	wasmModule: buf
}
