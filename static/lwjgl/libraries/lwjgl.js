var r = await fetch("/lwjgl/libraries/liblwjgl.so");
var buf = await r.arrayBuffer();
export default
{
	wasmModule: buf
}
