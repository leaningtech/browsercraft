<script lang="ts">
	import { onMount } from 'svelte';
	import { tryPlausible, showElement, hideElement, formatTime } from "./utilities";
	import spinnerWhite from '$lib/assets/loading-spinner-white.svg';
	import ghGIF from '$lib/assets/rate-us-on-gh.gif';
	import PageControls from './PageControls.svelte';

	const pathJarMinecraft = "/files/client_1.2.5.jar";
	const urlDownloadMinecraft = "https://piston-data.mojang.com/v1/objects/4a2fac7504182a97dcbcd7560c6392d7c8139928/client.jar";
	const pathJarLibs = `/app/lwjgl/lwjgl-2.9.3.jar:/app/lwjgl/lwjgl_util-2.9.3.jar:${pathJarMinecraft}`;

	let loading: HTMLDivElement;
	let display: HTMLDivElement;
	let intro: HTMLDivElement;
	let progressBar: HTMLProgressElement;
	let timeoutInfo: HTMLDivElement
	let timer: HTMLDivElement
	// The demo is limited to 3 minutes, and not intended to replace the full game
	let timeLeft = 180;
	let eulaAccepted = false;

	async function startCheerpJ() {
		await cheerpjInit({
			version: 8,
			javaProperties: ["java.library.path=/app/lwjgl/libraries/"],
			libraries: {"libGL.so.1": "/app/lwjgl/libraries/gl4es.wasm"},
			enableX11:true,
			preloadResources:{"/lt/8/jre/lib/rt.jar":[0,131072,1310720,1572864,4456448,4849664,5111808,5505024,7995392,8126464,9699328,9830400,9961472,11534336,11665408,12189696,12320768,12582912,13238272,13369344,15073280,15335424,15466496,15597568,15990784,16121856,16252928,16384000,16777216,16908288,17039360,17563648,17694720,17825792,17956864,18087936,18219008,18612224,18743296,18874368,19005440,19136512,19398656,19791872,20054016,20709376,20840448,21757952,21889024,26869760],"/lt/etc/users":[0,131072],"/lt/etc/localtime":[],"/lt/8/jre/lib/cheerpj-awt.jar":[0,131072],"/lt/8/lib/ext/meta-index":[0,131072],"/lt/8/lib/ext":[],"/lt/8/lib/ext/index.list":[],"/lt/8/lib/ext/localedata.jar":[],"/lt/8/jre/lib/jsse.jar":[0,131072,786432,917504],"/lt/8/jre/lib/jce.jar":[0,131072],"/lt/8/jre/lib/charsets.jar":[0,131072,1703936,1835008],"/lt/8/jre/lib/resources.jar":[0,131072,917504,1179648],"/lt/8/jre/lib/javaws.jar":[0,131072,1441792,1703936],"/lt/8/lib/ext/sunjce_provider.jar":[],"/lt/8/lib/security/java.security":[0,131072],"/lt/8/jre/lib/meta-index":[0,131072],"/lt/8/jre/lib":[],"/lt/8/lib/accessibility.properties":[],"/lt/8/lib/fonts/LucidaSansRegular.ttf":[],"/lt/8/lib/currency.data":[0,131072],"/lt/8/lib/currency.properties":[],"/lt/libraries/libGLESv2.so.1":[0,262144],"/lt/libraries/libEGL.so.1":[0,262144],"/lt/8/lib/fonts/badfonts.txt":[],"/lt/8/lib/fonts":[],"/lt/etc/hosts":[],"/lt/etc/resolv.conf":[0,131072],"/lt/8/lib/fonts/fallback":[],"/lt/fc/fonts/fonts.conf":[0,131072],"/lt/fc/ttf":[],"/lt/fc/cache/e21edda6a7db77f35ca341e0c3cb2a22-le32d8.cache-7":[0,131072],"/lt/fc/ttf/LiberationSans-Regular.ttf":[0,131072,262144,393216],"/lt/8/lib/jaxp.properties":[],"/lt/etc/timezone":[],"/lt/8/lib/tzdb.dat":[0,131072]}
		});
		await cheerpjCreateDisplay(-1, -1, display);

		hideElement(loading);
		showElement(intro);
	}

	async function startGame() {
		hideElement(intro);
		showElement(progressBar);

		await downloadFileToCheerpJ();
		hideElement(progressBar);
		showElement(display);
		showElement(timer);

		const timerChecker = setInterval(() => {
			timeLeft--;
			if (timeLeft < 0) {
				clearInterval(timerChecker);
				hideElement(display);
				hideElement(timer);
				showElement(timeoutInfo);
				document.exitPointerLock();
				document.activeElement?.blur();
				tryPlausible("EndDemo");
			}
		}, 1000);

		tryPlausible("Play");
		await cheerpjRunMain("net.minecraft.client.Minecraft", pathJarLibs)
	}

	async function downloadFileToCheerpJ() {
		const response = await fetch(urlDownloadMinecraft);
		const reader = response.body.getReader();
		const contentLength = +response.headers.get('Content-Length');

		const bytes = new Uint8Array(contentLength);
		progressBar.value = 0;
		progressBar.max = contentLength;

		let pos = 0;
		while (true) {
			const { done, value } = await reader.read();
			if (done)
				break;
			bytes.set(value, pos);
			pos += value.length;
			progressBar.value = pos;
			progressBar.max = contentLength;
		}

		// Write to CheerpJ filesystem
		return new Promise((resolve, reject) => {
			var fds = [];
			cheerpOSOpen(fds, pathJarMinecraft, "w", fd => {
				cheerpOSWrite(fds, fd, bytes, 0, bytes.length, w => {
					cheerpOSClose(fds, fd, resolve);
				});
			});
		});
	}

	onMount(async () => {
		loading = document.getElementById('loading');
		display = document.getElementById('display');
		intro = document.getElementById('intro');
		progressBar = document.getElementById('progress-bar');
		timeoutInfo = document.getElementById('timeout-info');
		timer = document.getElementById('timeout-timer');

		startCheerpJ();
	});
</script>

<div class="game-container">
	<div id="loading" class="loading-container">
		<img src={spinnerWhite} class="spinner" alt="Loading" />
		<p class="text-center">Loading CheerpJ ...</p>
	</div>
	<div id="intro" class="intro">
		<p>
			This is a proof-of-concept demo of Minecraft 1.2.5 running unmodified in the browser.
		</p>

		{#if !eulaAccepted}
			<p>
				<input
					type="checkbox"
					bind:checked={eulaAccepted}
				/>
				Before playing, you have to accept the <a href="https://www.minecraft.net/eula" target="_blank">Minecraft EULA</a>
			</p>
		{/if}

		{#if eulaAccepted}		
			<p>Clicking the button below will download the client from mojang.com.</p>
			<button on:click={startGame}>Play!</button>
		{/if}

		<div class="disclaimer">
			This is not an official Minecraft product. It is not approved by or associated with Mojang or Microsoft.
		</div>
	</div>
	<progress id="progress-bar"></progress>
	<div id="display" class="display"></div>
	<div id="timeout-info" class="timeout-info">
		<h1 class="title">DEMO TIMEOUT</h1>
		<p>
			Thanks for playing this CheerpJ demo.
		</p>
		<p>
			<a href="https://cheerpj.com" target="_blank">CheerpJ</a> is a WebAssembly JVM for the browser that can run any Java application, applet and library in the browser. Java 8, 11 and 17 are currently supported. Advanced features such as multithreading, reflection and custom classloaders are also fully supported, for more information you can join our <a href="https://discord.gg/7xXW6NAdHT" target="_blank">Discord</a>.
		</p>
		<p>
			Want to support us? Star Browsercraft on <a href="https://github.com/leaningtech/browsercraft" target="_blank">Github</a>.
		</p>
		<img src={ghGIF} alt="Github rate us">
	</div>
	<div id="timeout-timer" class="timeout-timer">
		<p>{formatTime(timeLeft)}</p>
	</div>
	<PageControls />
</div>
