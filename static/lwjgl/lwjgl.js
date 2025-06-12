var r = await fetch("lwjgl/liblwjgl.so");
var buf = await r.arrayBuffer();
export default
{
	wasmModule: buf
}
