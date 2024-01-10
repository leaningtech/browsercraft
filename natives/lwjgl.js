// Load the glMatrix library
await import("https://cdnjs.cloudflare.com/ajax/libs/gl-matrix/3.4.2/gl-matrix-min.js");

const mcCanvas = document.getElementById("mc");
const mcCtx = mcCanvas.getContext("webgl2", {antialias: false, alpha: false});

var vertexShaderSrc = `
	attribute vec4 aVertexPosition;
	attribute vec4 aColor;
	attribute vec2 aTexCoord;
	uniform mat4 modelView;
	uniform mat4 projection;
	varying vec2 vTexCoord;
	varying vec4 vColor;
	void main() {
		gl_Position = projection * modelView * aVertexPosition;
		vTexCoord = aTexCoord;
		vColor = aColor;
	}
`;
// NOTE: Only the default GL_MODULATE texEnv is supported here
var fragmentShaderSrc = `
	precision mediump float;
	uniform float uTextureMask;
	uniform sampler2D uSampler;
	varying vec2 vTexCoord;
	varying vec4 vColor;
	void main() {
		vec4 texSample = texture2D(uSampler, vTexCoord);
		vec4 colorValue = vColor * (1.0 - uTextureMask);
		vec4 texValue = vColor * texSample * uTextureMask;
		gl_FragColor = colorValue + texValue;
	}
`;
var vertexShader = mcCtx.createShader(mcCtx.VERTEX_SHADER);
mcCtx.shaderSource(vertexShader, vertexShaderSrc);
mcCtx.compileShader(vertexShader);
var fragmentShader = mcCtx.createShader(mcCtx.FRAGMENT_SHADER);
mcCtx.shaderSource(fragmentShader, fragmentShaderSrc);
mcCtx.compileShader(fragmentShader);
var program = mcCtx.createProgram();
mcCtx.attachShader(program, vertexShader);
mcCtx.attachShader(program, fragmentShader);
mcCtx.linkProgram(program);
mcCtx.useProgram(program);
var vertexBuffer = mcCtx.createBuffer();
var colorBuffer = mcCtx.createBuffer();
var texCoordBuffer = mcCtx.createBuffer();
var vertexPosition = mcCtx.getAttribLocation(program, "aVertexPosition");
var colorLocation = mcCtx.getAttribLocation(program, "aColor");
var texCoord = mcCtx.getAttribLocation(program, "aTexCoord");
var mvLocation = mcCtx.getUniformLocation(program, "modelView");
var projLocation = mcCtx.getUniformLocation(program, "projection");
var samplerLocation = mcCtx.getUniformLocation(program, "uSampler");
var texMaskLocation = mcCtx.getUniformLocation(program, "uTextureMask");
var vertexData =
{
	enabled: false,
	size: 0,
	type: 0,
	stride: 0,
	pointer: 0,
	buf: null
};
var normalData =
{
	enabled: false,
	size: 0,
	type: 0,
	stride: 0,
	pointer: 0,
	buf: null
};
var colorData =
{
	enabled: false,
	size: 0,
	type: 0,
	stride: 0,
	pointer: 0,
	buf: null
};
var texCoordData =
{
	enabled: false,
	size: 0,
	type: 0,
	stride: 0,
	pointer: 0,
	buf: null
};
// TODO: Make buffers resizeable if needed
var immediateModeData =
{
	mode: 0,
	vertexBuf: new Float32Array(32),
	vertexPos: 0,
	texCoordBuf: new Float32Array(32),
	texCoordPos: 0
};
var verboseLog = false;
var frameCount = 0;
// Set to a non-zero value to stop after a certain number of frames
var frameLimit = 0;
// NOTE: These initializes to identity
var projMatrixStack = [glMatrix.mat4.create()];
var modelViewMatrixStack = [glMatrix.mat4.create()];
var textureMatrixStack = [glMatrix.mat4.create()];
var curMatrixStack = modelViewMatrixStack;
function getCurMatrixTop()
{
	return curMatrixStack[curMatrixStack.length - 1];
}
function setCurMatrixTop(m)
{
	curMatrixStack[curMatrixStack.length - 1] = m;
}
function uploadDataImpl(buf, buffer, attributeLocation, size, type, stride)
{
	mcCtx.bindBuffer(mcCtx.ARRAY_BUFFER, buffer);
	mcCtx.bufferData(mcCtx.ARRAY_BUFFER, buf, mcCtx.STATIC_DRAW);
	mcCtx.vertexAttribPointer(attributeLocation, size, type, type != mcCtx.FLOAT, stride, 0);
	mcCtx.enableVertexAttribArray(attributeLocation);
}
function uploadData(v, data, buffer, attributeLocation, count)
{
	if(data.enabled)
	{
		assert(data.stride);
		var buf = data.buf;
		if(buf == null)
		{
			assert(v && data.pointer);
			buf = new Uint8Array(v.buffer, data.pointer, data.stride * count);
		}
		uploadDataImpl(buf, buffer, attributeLocation, data.size, data.type, data.stride);
	}
	else
	{
		mcCtx.disableVertexAttribArray(attributeLocation);
	}
}
function captureData(v, data, count)
{
	var ret = { enabled: data.enabled, size: data.size, type: data.type, stride: data.stride, pointer: 0, buf: null };
	if(data.enabled)
	{
		assert(data.stride);
		var buf = new Uint8Array(v.buffer, data.pointer, data.stride * count);
		// Capture the current data
		ret.buf = new Uint8Array(buf);
	}
	return ret;
}
function checkNoList(list)
{
	if(list != null)
		throw new Error("Unsupported command in list");
}
function pushInList(list, args, callee)
{
	// Not an elegant solution, but it works
	// It would be nicer to extract the actual implementation from native interfaces
	// to avoid bringing around the library object
	list.push({f: callee, a: Array.from(args)});
}
function callList(listId)
{
	var l = cmdLists[listId];
	for(var i=0;i<l.length;i++)
	{
		var c = l[i];
		c.f.apply(null, c.a);
	}
}
function drawArraysImpl(mode, first, count)
{
	// TODO: Conditional
	mcCtx.uniformMatrix4fv(mvLocation, false, modelViewMatrixStack[modelViewMatrixStack.length - 1]);
	mcCtx.uniformMatrix4fv(projLocation, false, projMatrixStack[projMatrixStack.length - 1]);
	assert(first == 0);
	// We can render each quad a separate GL_TRIANGLE_FAN
	if(mode == 7/*QUADS*/ && (count % 4) == 0)
	{
		for(var i=0;i<count;i+=4)
			mcCtx.drawArrays(mcCtx.TRIANGLE_FAN, i, 4);
	}
	else if(mode == mcCtx.LINES || mode == mcCtx.LINE_STRIP || mode == mcCtx.TRIANGLE_STRIP || mode == mcCtx.TRIANGLE_FAN)
	{
		mcCtx.drawArrays(mode, first, count);
	}
	else
	{
		debugger;
	}
}
function pushDrawArraysInList(list, v, mode, first, count)
{
	var args = [mode, first, count, captureData(v, vertexData, count), captureData(v, colorData, count), captureData(v, texCoordData, count)];
	list.push({f: drawArraysInList, a: args});
}
function drawArraysInList(mode, first, count, capturedVertexData, capturedColorData, capturedTexCoordData)
{
	// Upload vertex data
	uploadData(null, capturedVertexData, vertexBuffer, vertexPosition, count);
	// Upload color data
	uploadData(null, capturedColorData, colorBuffer, colorLocation, count);
	// Upload tex coord data
	uploadData(null, capturedTexCoordData, texCoordBuffer, texCoord, count);
	drawArraysImpl(mode, first, count);
}
// Fix the sampler to texture unit 0
mcCtx.uniform1i(samplerLocation, 0);
var curList = null;
var cmdLists = [null];
// The first null implicitly solves resetting on 0 id
var textureObjects = [null];
// We need to use an FBO as the main target to support copyTexSubImage2D that seems broken otherwise
var fbTexture = mcCtx.createTexture();
mcCtx.bindTexture(mcCtx.TEXTURE_2D, fbTexture);
mcCtx.texImage2D(mcCtx.TEXTURE_2D, 0, mcCtx.RGBA, 1000, 500, 0, mcCtx.RGBA, mcCtx.UNSIGNED_BYTE, null);
mcCtx.bindTexture(mcCtx.TEXTURE_2D, null);
var mainFb = mcCtx.createFramebuffer();
mcCtx.bindFramebuffer(mcCtx.READ_FRAMEBUFFER, mainFb);
mcCtx.bindFramebuffer(mcCtx.DRAW_FRAMEBUFFER, mainFb);
mcCtx.framebufferTexture2D(mcCtx.FRAMEBUFFER, mcCtx.COLOR_ATTACHMENT0, mcCtx.TEXTURE_2D, fbTexture, 0);
// Add a depth render buffer
var depthRb = mcCtx.createRenderbuffer();
mcCtx.bindRenderbuffer(mcCtx.RENDERBUFFER, depthRb);
mcCtx.renderbufferStorage(mcCtx.RENDERBUFFER, mcCtx.DEPTH_COMPONENT16, 1000, 500);
mcCtx.framebufferRenderbuffer(mcCtx.FRAMEBUFFER, mcCtx.DEPTH_ATTACHMENT, mcCtx.RENDERBUFFER, depthRb);
// Synthetize a focus event, it's needed for LWJGL logic
var eventQueue = [{type:"focus"}];

function convertMousePos(x, y) {
	// We have a framebuffer of 1000x500, but Minecraft renders into the bottom left corner of it.
	const offsetX = 0;
	const offsetY = mcCanvas.height - 500;

	const xRatio = mcCanvas.width / mcCanvas.clientWidth;
	const yRatio = mcCanvas.height / mcCanvas.clientHeight;

	return [x * xRatio - offsetX, y * yRatio - offsetY];
}

/** Convert from MouseEvent.button to X11 mouse button */
function convertMouseButton(button) {
	return button + 1;
}

mcCanvas.addEventListener("mousemove", evt => {
	const [x, y] = convertMousePos(evt.clientX, evt.clientY);

	if (eventQueue[0]?.type == evt.type) {
		// Update unhandled event
		eventQueue[0].x = x;
		eventQueue[0].y = y;
	} else {
		eventQueue.push({ type: evt.type, x, y });
	}
});
function mouseHandler(evt) {
	const [x, y] = convertMousePos(evt.clientX, evt.clientY);
	eventQueue.push({ type: evt.type, x, y, button: convertMouseButton(evt.button) });
}
mcCanvas.addEventListener("mousedown", mouseHandler);
mcCanvas.addEventListener("mouseup", mouseHandler);
mcCanvas.addEventListener("contextmenu", evt => evt.preventDefault());
function keyHandler(e)
{
	eventQueue.push({type:e.type, keyCode:e.key.charCodeAt(0)});
}
mcCanvas.addEventListener("keydown", keyHandler);
mcCanvas.addEventListener("keyup", keyHandler);
function Java_org_lwjgl_DefaultSysImplementation_getPointerSize()
{
	return 4;
}

function Java_org_lwjgl_DefaultSysImplementation_getJNIVersion()
{
	return 19;
}

function Java_org_lwjgl_DefaultSysImplementation_setDebug()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_nLockAWT()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_nUnlockAWT()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_setErrorHandler()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_openDisplay()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_nInternAtom()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_nIsXrandrSupported()
{
	return 0;
}

function Java_org_lwjgl_opengl_LinuxDisplay_nIsXF86VidModeSupported()
{
	return 1;
}

function Java_org_lwjgl_opengl_LinuxDisplay_nGetDefaultScreen()
{
	return 0;
}

async function Java_org_lwjgl_opengl_LinuxDisplay_nGetAvailableDisplayModes(lib)
{
	var DisplayMode = await lib.org.lwjgl.opengl.DisplayMode;
	var d = await new DisplayMode(1000, 500);
	return [d];
}

function Java_org_lwjgl_opengl_LinuxDisplay_nGetCurrentGammaRamp()
{
}

function Java_org_lwjgl_opengl_LinuxPeerInfo_createHandle()
{
}

function Java_org_lwjgl_opengl_GLContext_nLoadOpenGLLibrary()
{
}

function Java_org_lwjgl_opengl_LinuxDisplayPeerInfo_initDefaultPeerInfo()
{
}

function Java_org_lwjgl_opengl_LinuxDisplayPeerInfo_initDrawable()
{
}

function Java_org_lwjgl_opengl_AWTSurfaceLock_createHandle()
{
}

function Java_org_lwjgl_opengl_AWTSurfaceLock_lockAndInitHandle()
{
	return 1;
}

function Java_org_lwjgl_opengl_LinuxAWTGLCanvasPeerInfo_getScreenFromSurfaceInfo()
{
}

function Java_org_lwjgl_opengl_LinuxAWTGLCanvasPeerInfo_nInitHandle()
{
}

function Java_org_lwjgl_opengl_AWTSurfaceLock_nUnlock()
{
}

function Java_org_lwjgl_opengl_LinuxPeerInfo_nGetDrawable()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_nCreateWindow()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_mapRaised()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_nCreateBlankCursor()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_nSetTitle()
{
}

function Java_org_lwjgl_opengl_LinuxMouse_nGetButtonCount()
{
	return 3;
}

function Java_org_lwjgl_opengl_LinuxMouse_nQueryPointer()
{
}

function Java_org_lwjgl_opengl_LinuxMouse_nGetWindowHeight()
{
	return 500;
}

function Java_org_lwjgl_opengl_LinuxKeyboard_getModifierMapping()
{
}

function Java_org_lwjgl_opengl_LinuxKeyboard_nSetDetectableKeyRepeat()
{
}

function Java_org_lwjgl_opengl_LinuxKeyboard_openIM()
{
}

function Java_org_lwjgl_opengl_LinuxKeyboard_allocateComposeStatus()
{
}

function Java_org_lwjgl_opengl_LinuxContextImplementation_nCreate()
{
}

function Java_org_lwjgl_opengl_LinuxContextImplementation_nMakeCurrent()
{
}

function Java_org_lwjgl_opengl_GLContext_ngetFunctionAddress(lib, stringPtr)
{
	// Return any non-zero address, methods are called by name anyway
	return 1;
}

function Java_org_lwjgl_opengl_GL11_nglGetString(lib, id, funcPtr)
{
	checkNoList(curList);
	// Special case GL_EXTENSION for now
	if(id == 0x1F03)
	{
		// TODO: Do we need any?
		return "";
	}
	else
	{
		return mcCtx.getParameter(id);
	}
}

function Java_org_lwjgl_opengl_GL11_nglGetIntegerv(lib, id, memPtr, funcPtr)
{
	checkNoList(curList);
	var v = lib.getJNIDataView();
	var buf = new Int32Array(v.buffer, Number(memPtr), 4);
	if(id == /*GL_VIEWPORT*/0xba2)
	{
		buf[0] = 0;
		buf[1] = 0;
		buf[2] = 1000;
		buf[3] = 500;
	}
	else if(verboseLog)
	{
		console.log("glGetInteger", id);
	}
}

function Java_org_lwjgl_opengl_GL11_nglGetError()
{
	checkNoList(curList);
	// We like living dangerously
	return 0;
}

function Java_org_lwjgl_opengl_LinuxContextImplementation_nSetSwapInterval()
{
}

function Java_org_lwjgl_opengl_GL11_nglClearColor(lib, r, g, b, a, funcPtr)
{
	checkNoList(curList);
	return mcCtx.clearColor(r, g, b, a);
}

function Java_org_lwjgl_opengl_GL11_nglClear(lib, a, funcPtr)
{
	checkNoList(curList);
	mcCtx.clear(a);
}

function Java_org_lwjgl_opengl_LinuxContextImplementation_nSwapBuffers()
{
	if(verboseLog)
		console.warn("SwapBuffer");
	mcCtx.bindFramebuffer(mcCtx.DRAW_FRAMEBUFFER, null);
	mcCtx.blitFramebuffer(0, 0, 1000, 500, 0, 0, 1000, 500, mcCtx.COLOR_BUFFER_BIT, mcCtx.NEAREST);
	mcCtx.bindFramebuffer(mcCtx.DRAW_FRAMEBUFFER, mainFb);
	frameCount++;
	if(frameCount == frameLimit)
	{
		console.warn("Stopping");
		return new Promise(function(){});
	}
	return new Promise(function(f, r)
	{
		requestAnimationFrame(f);
	});
}

function Java_org_lwjgl_opengl_LinuxEvent_getPending()
{
	return eventQueue.length;
}

function Java_org_lwjgl_opengl_GL11_nglMatrixMode(lib, matrixMode, funcPtr)
{
	if(curList)
		return pushInList(curList, arguments, Java_org_lwjgl_opengl_GL11_nglMatrixMode);
	if(matrixMode == 0x1700/*GL_MODELVIEW*/)
		curMatrixStack = modelViewMatrixStack;
	else if(matrixMode == 0x1701/*GL_PROJECTION*/)
		curMatrixStack = projMatrixStack;
	else if(matrixMode == 0x1702/*GL_TEXTURE*/)
		curMatrixStack = textureMatrixStack;
	else
		debugger;
}

function Java_org_lwjgl_opengl_GL11_nglLoadIdentity(lib, funcPtr)
{
	checkNoList(curList);
	glMatrix.mat4.identity(getCurMatrixTop());
}

function Java_org_lwjgl_opengl_GL11_nglOrtho(lib, left, right, bottom, top, nearVal, farVal, funcPtr)
{
	checkNoList(curList);
	var m = getCurMatrixTop();
	var o = glMatrix.mat4.create();
	glMatrix.mat4.ortho(o, left, right, bottom, top, nearVal, farVal);
	var out = glMatrix.mat4.create();
	setCurMatrixTop(glMatrix.mat4.multiply(out, m, o));
}

function Java_org_lwjgl_opengl_GL11_nglTranslatef(lib, x, y, z, funcPtr)
{
	if(curList)
		return pushInList(curList, arguments, Java_org_lwjgl_opengl_GL11_nglTranslatef);
	var m = getCurMatrixTop();
	var out = glMatrix.mat4.create();
	setCurMatrixTop(glMatrix.mat4.translate(out, m, glMatrix.vec3.fromValues(x, y, z)));
}

function Java_org_lwjgl_opengl_GL11_nglViewport(lib, x, y, width, height, funcPtr)
{
	checkNoList(curList);
	mcCtx.viewport(x, y, width, height);
}

function Java_org_lwjgl_opengl_GL11_nglDisable(lib, a, funcPtr)
{
	checkNoList(curList);
	if(a == mcCtx.BLEND || a == mcCtx.CULL_FACE || a == mcCtx.DEPTH_TEST)
		mcCtx.disable(a);
	else if(a == 0xde1/*GL_TEXTURE_2D*/)
		mcCtx.uniform1f(texMaskLocation, 0);
	else if(verboseLog)
		console.log("glDisable " + a.toString(16));
}

function Java_org_lwjgl_opengl_GL11_nglEnable(lib, a, funcPtr)
{
	checkNoList(curList);
	if(a == mcCtx.BLEND || a == mcCtx.CULL_FACE || a == mcCtx.DEPTH_TEST)
		mcCtx.enable(a);
	else if(a == 0xde1/*GL_TEXTURE_2D*/)
		mcCtx.uniform1f(texMaskLocation, 1);
	else if(verboseLog)
		console.log("glEnable " + a.toString(16));
}

function Java_org_lwjgl_opengl_GL11_nglGenTextures(lib, n, memPtr, funcPtr)
{
	checkNoList(curList);
	var v = lib.getJNIDataView();
	var buf = new Int32Array(v.buffer, Number(memPtr), n);
	for(var i=0;i<n;i++)
	{
		var id = textureObjects.length;
		buf[i] = id;
		textureObjects[id] = mcCtx.createTexture();
	}
}

function Java_org_lwjgl_opengl_GL11_nglBindTexture(lib, target, id, funcPtr)
{
	checkNoList(curList);
	assert(target == mcCtx.TEXTURE_2D);
	mcCtx.bindTexture(target, textureObjects[id]);
}

function Java_org_lwjgl_opengl_GL11_nglTexParameteri(lib, target, pname, param, funcPtr)
{
	checkNoList(curList);
	mcCtx.texParameteri(target, pname, param);
}

function Java_org_lwjgl_opengl_GL11_nglTexImage2D(lib, target, level, internalFormat, width, height, border, format, type, memPtr, funcPtr)
{
	checkNoList(curList);
	assert(target == mcCtx.TEXTURE_2D);
	var v = lib.getJNIDataView();
	// Build an unbound array, WebGL will truncate as needed
	var buf = new Uint8Array(v.buffer, Number(memPtr));
	mcCtx.texImage2D(target, level, internalFormat, width, height, border, format, type, buf);
}

function Java_org_lwjgl_opengl_GL11_nglTexCoordPointer(lib, size, type, stride, memPtr, funcPtr)
{
	texCoordData.size = size;
	texCoordData.type = type;
	texCoordData.stride = stride;
	texCoordData.pointer = Number(memPtr);
}

function Java_org_lwjgl_opengl_GL11_nglEnableClientState(lib, v, funcPtr)
{
	if(v == 0x8074/*GL_VERTEX_ARRAY*/)
	{
		vertexData.enabled = true;
	}
	else if(v == 0x8075/*GL_NORMAL_ARRAY*/)
	{
		normalData.enabled = true;
	}
	else if(v == 0x8076/*GL_COLOR_ARRAY*/)
	{
		colorData.enabled = true;
	}
	else if(v == 0x8078/*GL_TEXTURE_COORD_ARRAY*/)
	{
		texCoordData.enabled = true;
	}
	else if(verboseLog)
	{
		console.log("glEnableClientState");
	}
}

function Java_org_lwjgl_opengl_GL11_nglColorPointer(lib, size, type, stride, memPtr, funcPtr)
{
	colorData.size = size;
	colorData.type = type;
	colorData.stride = stride;
	colorData.pointer = Number(memPtr);
}

function Java_org_lwjgl_opengl_GL11_nglVertexPointer(lib, size, type, stride, memPtr, funcPtr)
{
	vertexData.size = size;
	vertexData.type = type;
	vertexData.stride = stride;
	vertexData.pointer = Number(memPtr);
}

function Java_org_lwjgl_opengl_GL11_nglDrawArrays(lib, mode, first, count, funcPtr)
{
	var v = lib.getJNIDataView();
	if(curList)
	{
		// Capture client state at this point in time
		return pushDrawArraysInList(curList, v, mode, first, count);
	}
	// Upload vertex data
	uploadData(v, vertexData, vertexBuffer, vertexPosition, count);
	// Upload color data
	uploadData(v, colorData, colorBuffer, colorLocation, count);
	// Upload tex coord data
	uploadData(v, texCoordData, texCoordBuffer, texCoord, count);
	drawArraysImpl(mode, first, count);
}

function Java_org_lwjgl_opengl_GL11_nglDisableClientState(lib, v, funcPtr)
{
	if(v == 0x8074/*GL_VERTEX_ARRAY*/)
	{
		vertexData.enabled = false;
	}
	else if(v == 0x8075/*GL_NORMAL_ARRAY*/)
	{
		normalData.enabled = false;
	}
	else if(v == 0x8076/*GL_COLOR_ARRAY*/)
	{
		colorData.enabled = false;
	}
	else if(v == 0x8078/*GL_TEXTURE_COORD_ARRAY*/)
	{
		texCoordData.enabled = false;
	}
	else if(verboseLog)
	{
		console.log("glDisableClientState");
	}
}

function Java_org_lwjgl_opengl_GL11_nglColor4f(lib, r, g, b, a, funcPtr)
{
	checkNoList(curList);
	mcCtx.vertexAttrib4f(colorLocation, r, g, b, a);
}

function Java_org_lwjgl_opengl_GL11_nglAlphaFunc()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glAlphaFunc");
}

function Java_org_lwjgl_opengl_GL11_nglGenLists(lib, range, funcPtr)
{
	checkNoList(curList);
	var ret = cmdLists.length;
	for(var i=0;i<range;i++)
		cmdLists.push([]);
	return ret;
}

function Java_org_lwjgl_opengl_GL11_nglNewList(lib, list, mode, funcPtr)
{
	checkNoList(curList);
	assert(mode == 0x1300/*GL_COMPILE*/);
	curList = cmdLists[list];
	// Wipe out the current contents of the list if any
	curList.length = 0;
}

function Java_org_lwjgl_opengl_GL11_nglEndList(lib, funcPtr)
{
	curList = null;
}

function Java_org_lwjgl_opengl_GL11_nglColor3f()
{
	if(curList)
		return pushInList(curList, arguments, Java_org_lwjgl_opengl_GL11_nglColor3f);
	if(verboseLog)
		console.log("glColor3f");
}

function Java_org_lwjgl_opengl_LinuxDisplay_nGetNativeCursorCapabilities()
{
}

function Java_org_lwjgl_opengl_GL11_nglShadeModel()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glShaderModel");
}

function Java_org_lwjgl_opengl_GL11_nglClearDepth(lib, a, funcPtr)
{
	checkNoList(curList);
	mcCtx.clearDepth(a);
}

function Java_org_lwjgl_opengl_GL11_nglDepthFunc(lib, a, funcPtr)
{
	checkNoList(curList);
	mcCtx.depthFunc(a);
}

function Java_org_lwjgl_opengl_GL11_nglCullFace(lib, mode, funcPtr)
{
	checkNoList(curList);
	mcCtx.cullFace(mode);
}

function Java_org_lwjgl_opengl_GL11_nglPushMatrix(lib, funcPtr)
{
	if(curList)
		return pushInList(curList, arguments, Java_org_lwjgl_opengl_GL11_nglPushMatrix);
	curMatrixStack.push(glMatrix.mat4.clone(curMatrixStack[curMatrixStack.length - 1]));
}

function Java_org_lwjgl_opengl_GL11_nglPopMatrix(lib, funcPtr)
{
	if(curList)
		return pushInList(curList, arguments, Java_org_lwjgl_opengl_GL11_nglPopMatrix);
	curMatrixStack.pop();
}

function Java_org_lwjgl_opengl_GL11_nglMultMatrixf(lib, memPtr, funcPtr)
{
	checkNoList(curList);
	var m = getCurMatrixTop();
	var v = lib.getJNIDataView();
	var buf = new Float32Array(v.buffer, Number(memPtr), 16);
	var out = glMatrix.mat4.create();
	setCurMatrixTop(glMatrix.mat4.multiply(out, m, buf));
}

function Java_org_lwjgl_opengl_GL11_nglRotatef(lib, angle, x, y, z, funcPtr)
{
	checkNoList(curList);
	var m = getCurMatrixTop();
	var out = glMatrix.mat4.create();
	setCurMatrixTop(glMatrix.mat4.rotate(out, m, angle * Math.PI / 180.0, glMatrix.vec3.fromValues(x, y, z)));
}

function Java_org_lwjgl_opengl_GL11_nglDepthMask(lib, a, funcPtr)
{
	checkNoList(curList);
	mcCtx.depthMask(a);
}

function Java_org_lwjgl_opengl_GL11_nglBlendFunc(lib, sfactor, dfactor)
{
	checkNoList(curList);
	mcCtx.blendFunc(sfactor, dfactor);
}

function Java_org_lwjgl_opengl_GL11_nglColorMask(lib, r, g, b, a, funcPtr)
{
	checkNoList(curList);
	mcCtx.colorMask(r, g, b, a);
}

function Java_org_lwjgl_opengl_GL11_nglCopyTexSubImage2D(lib, target, level, xoffset, yoffset, x, y, width, height, funcPtr)
{
	checkNoList(curList);
	mcCtx.copyTexSubImage2D(target, level, xoffset, yoffset, x, y, width, height);
}

function Java_org_lwjgl_opengl_GL11_nglScalef(lib, x, y, z, funcPtr)
{
	if(curList)
		return pushInList(curList, arguments, Java_org_lwjgl_opengl_GL11_nglScalef);
	var m = getCurMatrixTop();
	var out = glMatrix.mat4.create();
	setCurMatrixTop(glMatrix.mat4.scale(out, m, glMatrix.vec3.fromValues(x, y, z)));
}

function Java_org_lwjgl_opengl_GL11_nglCallLists(lib, n, type, memPtr, funcPtr)
{
	checkNoList(curList);
	assert(type == mcCtx.UNSIGNED_INT);
	var v = lib.getJNIDataView();
	var buf = new Int32Array(v.buffer, Number(memPtr), n);
	for(var i=0;i<n;i++)
		callList(buf[i]);
}

function Java_org_lwjgl_opengl_GL11_nglFlush()
{
	checkNoList(curList);
	mcCtx.flush();
}

function Java_org_lwjgl_opengl_GL11_nglTexSubImage2D(lib, target, level, xoffset, yoffset, width, height, format, type, memPtr, funcPtr)
{
	checkNoList(curList);
	assert(target == mcCtx.TEXTURE_2D);
	var v = lib.getJNIDataView();
	// Build an unbound array, WebGL will truncate as needed
	var buf = new Uint8Array(v.buffer, Number(memPtr));
	mcCtx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, buf);
}

function Java_org_lwjgl_opengl_GL11_nglGetFloatv(lib, a, memPtr, funcPtr)
{
	checkNoList(curList);
	var v = lib.getJNIDataView();
	var buf = new Float32Array(v.buffer, Number(memPtr), 16);
	if(a == /*GL_MODELVIEW_MATRIX*/0xba6)
	{
		var m = modelViewMatrixStack[modelViewMatrixStack.length - 1];
		for(var i=0;i<16;i++)
			buf[i] = m[i];
	}
	else if(a == /*GL_PROJECTION_MATRIX*/0xba7)
	{
		var m = projMatrixStack[projMatrixStack.length - 1];
		for(var i=0;i<16;i++)
			buf[i] = m[i];
	}
	else if(verboseLog)
	{
		console.log("glGetFloat "+a);
	}
}

function Java_org_lwjgl_opengl_GL11_nglFogfv()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glFog");
}

function Java_org_lwjgl_opengl_GL11_nglNormal3f()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glNormal3f");
}

function Java_org_lwjgl_opengl_GL11_nglFogi()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glFogi");
}

function Java_org_lwjgl_opengl_GL11_nglFogf()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glFogf");
}

function Java_org_lwjgl_opengl_GL11_nglColorMaterial()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glColorMaterial");
}

function Java_org_lwjgl_opengl_GL11_nglCallList(lib, listId, funcPtr)
{
	checkNoList(curList);
	callList(listId);
}

function Java_org_lwjgl_opengl_GL13_nglActiveTexture()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glActiveTexture");
}

function Java_org_lwjgl_opengl_GL11_nglLightfv()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glLightfv");
}

function Java_org_lwjgl_opengl_GL11_nglLightModelfv()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glLightModelfv");
}

function Java_org_lwjgl_opengl_GL11_nglNormalPointer(lib, type, stride, memPtr, funcPtr)
{
	normalData.size = 3;
	normalData.type = type;
	normalData.stride = stride;
	normalData.pointer = Number(memPtr);
}

function Java_org_lwjgl_opengl_GL13_nglMultiTexCoord2f()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glMultiTexCoord2f");
}

function Java_org_lwjgl_opengl_GL13_nglClientActiveTexture()
{
	if(verboseLog)
		console.log("glClientActiveTexture");
}

function Java_org_lwjgl_opengl_GL11_nglLineWidth()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glLineWidth");
}

function Java_org_lwjgl_opengl_GL11_nglPolygonOffset()
{
	checkNoList(curList);
	if(verboseLog)
		console.log("glPolygonOffset");
}

function Java_org_lwjgl_opengl_GL11_nglBegin(lib, mode, funcPtr)
{
	checkNoList(curList);
	immediateModeData.mode = mode;
	immediateModeData.vertexPos = 0;
	immediateModeData.texCoordPos = 0;
}

function Java_org_lwjgl_opengl_GL11_nglTexCoord2f(lib, x, y, funcPtr)
{
	checkNoList(curList);
	var curPos = immediateModeData.texCoordPos;
	if(curPos > immediateModeData.texCoordBuf.length)
	{
		console.log("glTexCoord2f overflow");
		return;
	}
	immediateModeData.texCoordBuf[curPos] = x;
	immediateModeData.texCoordBuf[curPos + 1] = y;
	immediateModeData.texCoordPos = curPos + 2;
}

function Java_org_lwjgl_opengl_GL11_nglVertex3f(lib, x, y, z, funcPtr)
{
	checkNoList(curList);
	var curPos = immediateModeData.vertexPos;
	if(curPos > immediateModeData.vertexBuf.length)
	{
		console.log("glVertex3f overflow");
		return;
	}
	immediateModeData.vertexBuf[curPos] = x;
	immediateModeData.vertexBuf[curPos + 1] = y;
	immediateModeData.vertexBuf[curPos + 2] = z;
	immediateModeData.vertexPos = curPos + 3;
}

function Java_org_lwjgl_opengl_GL11_nglEnd(lib, funcPtr)
{
	checkNoList(curList);
	// Upload vertex data
	uploadDataImpl(immediateModeData.vertexBuf.subarray(0, immediateModeData.vertexPos), vertexBuffer, vertexPosition, 3, mcCtx.FLOAT, 3 * 4);
	// TODO: Should we do something about color data?
	// Upload tex coord data
	uploadDataImpl(immediateModeData.texCoordBuf.subarray(0, immediateModeData.texCoordPos), texCoordBuffer, texCoord, 2, mcCtx.FLOAT, 2 * 4);
	// NOTE: We count vertices
	drawArraysImpl(immediateModeData.mode, 0, immediateModeData.vertexPos / 3);
}

// These stubs make sure audio creation fails sooner rather than later
function Java_org_lwjgl_openal_AL_nCreate()
{
}

function Java_org_lwjgl_openal_AL10_initNativeStubs()
{
}

function Java_org_lwjgl_openal_ALC10_initNativeStubs()
{
}

function Java_org_lwjgl_openal_ALC10_nalcOpenDevice()
{
}

function Java_org_lwjgl_openal_AL_resetNativeStubs()
{
}

function Java_org_lwjgl_openal_AL_nDestroy()
{
}

// Basic input support
async function Java_org_lwjgl_opengl_LinuxEvent_createEventBuffer(lib)
{
	// This is intended to represent a X11 event, but we are free to use any layout
	var ByteBuffer = await lib.java.nio.ByteBuffer;
	return await ByteBuffer.allocateDirect(4 * 8);
}

async function Java_org_lwjgl_opengl_LinuxEvent_nNextEvent(lib, windowId, buffer)
{
	// Resolve the address and directly access the JNI memory
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	var e = eventQueue.shift();
	switch(e.type)
	{
		case "focus":
			v.setInt32(0, /*FocusIn*/9, true);
			break;
		case "mousedown":
			v.setInt32(0, /*ButtonPress*/4, true);
			v.setInt32(4, e.x, true);
			v.setInt32(8, e.y, true);
			v.setInt32(12, e.button, true);
			break;
		case "mouseup":
			v.setInt32(0, /*ButtonRelease*/5, true);
			v.setInt32(4, e.x, true);
			v.setInt32(8, e.y, true);
			v.setInt32(12, e.button, true);
			break;
		case "mousemove":
			v.setInt32(0, /*MotionNotify*/6, true);
			v.setInt32(4, e.x, true);
			v.setInt32(8, e.y, true);
			break;
		case "keydown":
			v.setInt32(0, /*KeyPress*/2, true);
			v.setInt32(4, e.keyCode, true);
			break;
		case "keyup":
			v.setInt32(0, /*KeyRelease*/3, true);
			v.setInt32(4, e.keyCode, true);
			break;
		default:
			debugger;
	}
}

function Java_org_lwjgl_opengl_LinuxEvent_nGetWindow()
{
	// Only a single window is emulated
	return 0;
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetType(lib, buffer)
{
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	return v.getInt32(0, true);
}

function Java_org_lwjgl_opengl_LinuxEvent_nFilterEvent()
{
}

function Java_org_lwjgl_opengl_LinuxEvent_nGetButtonTime()
{
	// TODO: Event timestamps
}

function Java_org_lwjgl_opengl_LinuxEvent_nGetButtonRoot()
{
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetButtonXRoot(lib, buffer)
{
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	return v.getInt32(4, true);
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetButtonYRoot(lib, buffer)
{
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	return v.getInt32(8, true);
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetButtonX(lib, buffer)
{
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	return v.getInt32(4, true);
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetButtonY(lib, buffer)
{
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	return v.getInt32(8, true);
}

function Java_org_lwjgl_opengl_LinuxEvent_nGetFocusDetail()
{
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetButtonType(lib, buffer)
{
	// Same as type, apparently
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	return v.getInt32(0, true);
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetButtonButton(lib, buffer)
{
	const v = lib.getJNIDataView();
	return v.getInt32(12, true);
}

function Java_org_lwjgl_opengl_LinuxDisplay_nGrabPointer()
{
}

function Java_org_lwjgl_opengl_LinuxDisplay_nDefineCursor()
{
}

function Java_org_lwjgl_opengl_LinuxMouse_nGetWindowWidth()
{
	return 1000;
}

function Java_org_lwjgl_opengl_LinuxMouse_nSendWarpEvent()
{
}

function Java_org_lwjgl_opengl_LinuxMouse_nWarpCursor()
{
}

function Java_org_lwjgl_opengl_LinuxEvent_nSetWindow()
{
}

function Java_org_lwjgl_opengl_LinuxEvent_nSendEvent()
{
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetKeyAddress(lib, buffer)
{
	// Should probably be a pointer, cheat and use directly the value
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	return v.getInt32(4, true);
}

function Java_org_lwjgl_opengl_LinuxEvent_nGetKeyTime()
{
	// TODO: Event timestamps
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetKeyType(lib, buffer)
{
	// Same as type, apparently
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	return v.getInt32(0, true);
}

async function Java_org_lwjgl_opengl_LinuxEvent_nGetKeyKeyCode(lib, buffer)
{
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	return v.getInt32(4, true);
}

function Java_org_lwjgl_opengl_LinuxEvent_nGetKeyState()
{
}

function Java_org_lwjgl_opengl_LinuxKeyboard_lookupKeysym(lib, eventPtr, index)
{
	return Number(eventPtr);
}

async function Java_org_lwjgl_opengl_LinuxKeyboard_lookupString(lib, eventPtr, buffer)
{
	// Only support single chars
	var bufferAddr = Number(await buffer.address());
	var v = lib.getJNIDataView();
	v.setInt8(bufferAddr, Number(eventPtr));
	return 1;
}

export default {
	Java_org_lwjgl_DefaultSysImplementation_getPointerSize,
	Java_org_lwjgl_DefaultSysImplementation_getJNIVersion,
	Java_org_lwjgl_DefaultSysImplementation_setDebug,
	Java_org_lwjgl_opengl_LinuxDisplay_nLockAWT,
	Java_org_lwjgl_opengl_LinuxDisplay_nUnlockAWT,
	Java_org_lwjgl_opengl_LinuxDisplay_setErrorHandler,
	Java_org_lwjgl_opengl_LinuxDisplay_openDisplay,
	Java_org_lwjgl_opengl_LinuxDisplay_nInternAtom,
	Java_org_lwjgl_opengl_LinuxDisplay_nIsXrandrSupported,
	Java_org_lwjgl_opengl_LinuxDisplay_nIsXF86VidModeSupported,
	Java_org_lwjgl_opengl_LinuxDisplay_nGetDefaultScreen,
	Java_org_lwjgl_opengl_LinuxDisplay_nGetAvailableDisplayModes,
	Java_org_lwjgl_opengl_LinuxDisplay_nGetCurrentGammaRamp,
	Java_org_lwjgl_opengl_LinuxPeerInfo_createHandle,
	Java_org_lwjgl_opengl_GLContext_nLoadOpenGLLibrary,
	Java_org_lwjgl_opengl_LinuxDisplayPeerInfo_initDefaultPeerInfo,
	Java_org_lwjgl_opengl_LinuxDisplayPeerInfo_initDrawable,
	Java_org_lwjgl_opengl_AWTSurfaceLock_createHandle,
	Java_org_lwjgl_opengl_AWTSurfaceLock_lockAndInitHandle,
	Java_org_lwjgl_opengl_LinuxAWTGLCanvasPeerInfo_getScreenFromSurfaceInfo,
	Java_org_lwjgl_opengl_LinuxAWTGLCanvasPeerInfo_nInitHandle,
	Java_org_lwjgl_opengl_AWTSurfaceLock_nUnlock,
	Java_org_lwjgl_opengl_LinuxPeerInfo_nGetDrawable,
	Java_org_lwjgl_opengl_LinuxDisplay_nCreateWindow,
	Java_org_lwjgl_opengl_LinuxDisplay_mapRaised,
	Java_org_lwjgl_opengl_LinuxDisplay_nCreateBlankCursor,
	Java_org_lwjgl_opengl_LinuxDisplay_nSetTitle,
	Java_org_lwjgl_opengl_LinuxMouse_nGetButtonCount,
	Java_org_lwjgl_opengl_LinuxMouse_nQueryPointer,
	Java_org_lwjgl_opengl_LinuxMouse_nGetWindowHeight,
	Java_org_lwjgl_opengl_LinuxKeyboard_getModifierMapping,
	Java_org_lwjgl_opengl_LinuxKeyboard_nSetDetectableKeyRepeat,
	Java_org_lwjgl_opengl_LinuxKeyboard_openIM,
	Java_org_lwjgl_opengl_LinuxKeyboard_allocateComposeStatus,
	Java_org_lwjgl_opengl_LinuxContextImplementation_nCreate,
	Java_org_lwjgl_opengl_LinuxContextImplementation_nMakeCurrent,
	Java_org_lwjgl_opengl_GLContext_ngetFunctionAddress,
	Java_org_lwjgl_opengl_GL11_nglGetString,
	Java_org_lwjgl_opengl_GL11_nglGetIntegerv,
	Java_org_lwjgl_opengl_GL11_nglGetError,
	Java_org_lwjgl_opengl_LinuxContextImplementation_nSetSwapInterval,
	Java_org_lwjgl_opengl_GL11_nglClearColor,
	Java_org_lwjgl_opengl_GL11_nglClear,
	Java_org_lwjgl_opengl_LinuxContextImplementation_nSwapBuffers,
	Java_org_lwjgl_opengl_LinuxEvent_getPending,
	Java_org_lwjgl_opengl_GL11_nglMatrixMode,
	Java_org_lwjgl_opengl_GL11_nglLoadIdentity,
	Java_org_lwjgl_opengl_GL11_nglOrtho,
	Java_org_lwjgl_opengl_GL11_nglTranslatef,
	Java_org_lwjgl_opengl_GL11_nglViewport,
	Java_org_lwjgl_opengl_GL11_nglDisable,
	Java_org_lwjgl_opengl_GL11_nglEnable,
	Java_org_lwjgl_opengl_GL11_nglGenTextures,
	Java_org_lwjgl_opengl_GL11_nglBindTexture,
	Java_org_lwjgl_opengl_GL11_nglTexParameteri,
	Java_org_lwjgl_opengl_GL11_nglTexImage2D,
	Java_org_lwjgl_opengl_GL11_nglTexCoordPointer,
	Java_org_lwjgl_opengl_GL11_nglEnableClientState,
	Java_org_lwjgl_opengl_GL11_nglColorPointer,
	Java_org_lwjgl_opengl_GL11_nglVertexPointer,
	Java_org_lwjgl_opengl_GL11_nglDrawArrays,
	Java_org_lwjgl_opengl_GL11_nglDisableClientState,
	Java_org_lwjgl_opengl_GL11_nglColor4f,
	Java_org_lwjgl_opengl_GL11_nglAlphaFunc,
	Java_org_lwjgl_opengl_GL11_nglGenLists,
	Java_org_lwjgl_opengl_GL11_nglNewList,
	Java_org_lwjgl_opengl_GL11_nglEndList,
	Java_org_lwjgl_opengl_GL11_nglColor3f,
	Java_org_lwjgl_opengl_LinuxDisplay_nGetNativeCursorCapabilities,
	Java_org_lwjgl_opengl_GL11_nglShadeModel,
	Java_org_lwjgl_opengl_GL11_nglClearDepth,
	Java_org_lwjgl_opengl_GL11_nglDepthFunc,
	Java_org_lwjgl_opengl_GL11_nglCullFace,
	Java_org_lwjgl_opengl_GL11_nglPushMatrix,
	Java_org_lwjgl_opengl_GL11_nglPopMatrix,
	Java_org_lwjgl_opengl_GL11_nglMultMatrixf,
	Java_org_lwjgl_opengl_GL11_nglRotatef,
	Java_org_lwjgl_opengl_GL11_nglDepthMask,
	Java_org_lwjgl_opengl_GL11_nglBlendFunc,
	Java_org_lwjgl_opengl_GL11_nglColorMask,
	Java_org_lwjgl_opengl_GL11_nglCopyTexSubImage2D,
	Java_org_lwjgl_opengl_GL11_nglScalef,
	Java_org_lwjgl_opengl_GL11_nglCallLists,
	Java_org_lwjgl_opengl_GL11_nglFlush,
	Java_org_lwjgl_opengl_GL11_nglTexSubImage2D,
	Java_org_lwjgl_opengl_GL11_nglGetFloatv,
	Java_org_lwjgl_opengl_GL11_nglFogfv,
	Java_org_lwjgl_opengl_GL11_nglNormal3f,
	Java_org_lwjgl_opengl_GL11_nglFogi,
	Java_org_lwjgl_opengl_GL11_nglFogf,
	Java_org_lwjgl_opengl_GL11_nglColorMaterial,
	Java_org_lwjgl_opengl_GL11_nglCallList,
	Java_org_lwjgl_opengl_GL13_nglActiveTexture,
	Java_org_lwjgl_opengl_GL11_nglLightfv,
	Java_org_lwjgl_opengl_GL11_nglLightModelfv,
	Java_org_lwjgl_opengl_GL11_nglNormalPointer,
	Java_org_lwjgl_opengl_GL13_nglMultiTexCoord2f,
	Java_org_lwjgl_opengl_GL13_nglClientActiveTexture,
	Java_org_lwjgl_opengl_GL11_nglLineWidth,
	Java_org_lwjgl_opengl_GL11_nglPolygonOffset,
	Java_org_lwjgl_opengl_GL11_nglBegin,
	Java_org_lwjgl_opengl_GL11_nglTexCoord2f,
	Java_org_lwjgl_opengl_GL11_nglVertex3f,
	Java_org_lwjgl_opengl_GL11_nglEnd,
	Java_org_lwjgl_openal_AL_nCreate,
	Java_org_lwjgl_openal_AL10_initNativeStubs,
	Java_org_lwjgl_openal_ALC10_initNativeStubs,
	Java_org_lwjgl_openal_ALC10_nalcOpenDevice,
	Java_org_lwjgl_openal_AL_resetNativeStubs,
	Java_org_lwjgl_openal_AL_nDestroy,
	Java_org_lwjgl_opengl_LinuxEvent_createEventBuffer,
	Java_org_lwjgl_opengl_LinuxEvent_nNextEvent,
	Java_org_lwjgl_opengl_LinuxEvent_nGetWindow,
	Java_org_lwjgl_opengl_LinuxEvent_nGetType,
	Java_org_lwjgl_opengl_LinuxEvent_nFilterEvent,
	Java_org_lwjgl_opengl_LinuxEvent_nGetButtonTime,
	Java_org_lwjgl_opengl_LinuxEvent_nGetButtonRoot,
	Java_org_lwjgl_opengl_LinuxEvent_nGetButtonXRoot,
	Java_org_lwjgl_opengl_LinuxEvent_nGetButtonYRoot,
	Java_org_lwjgl_opengl_LinuxEvent_nGetButtonX,
	Java_org_lwjgl_opengl_LinuxEvent_nGetButtonY,
	Java_org_lwjgl_opengl_LinuxEvent_nGetFocusDetail,
	Java_org_lwjgl_opengl_LinuxEvent_nGetButtonType,
	Java_org_lwjgl_opengl_LinuxEvent_nGetButtonButton,
	Java_org_lwjgl_opengl_LinuxDisplay_nGrabPointer,
	Java_org_lwjgl_opengl_LinuxDisplay_nDefineCursor,
	Java_org_lwjgl_opengl_LinuxMouse_nGetWindowWidth,
	Java_org_lwjgl_opengl_LinuxMouse_nSendWarpEvent,
	Java_org_lwjgl_opengl_LinuxMouse_nWarpCursor,
	Java_org_lwjgl_opengl_LinuxEvent_nSetWindow,
	Java_org_lwjgl_opengl_LinuxEvent_nSendEvent,
	Java_org_lwjgl_opengl_LinuxEvent_nGetKeyAddress,
	Java_org_lwjgl_opengl_LinuxEvent_nGetKeyTime,
	Java_org_lwjgl_opengl_LinuxEvent_nGetKeyType,
	Java_org_lwjgl_opengl_LinuxEvent_nGetKeyKeyCode,
	Java_org_lwjgl_opengl_LinuxEvent_nGetKeyState,
	Java_org_lwjgl_opengl_LinuxKeyboard_lookupKeysym,
	Java_org_lwjgl_opengl_LinuxKeyboard_lookupString,
}
