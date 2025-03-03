var r = await fetch("/libraries/lwjgl2.wasm");
var buf = await r.arrayBuffer();
export default
{
	wasmModule: buf
}
