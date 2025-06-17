<script lang="ts">
	import MinecraftClient from "$lib/minecraft-web";
	import { onMount } from "svelte";
	import { eulaAccepted, minecraftClient } from "./state";

	onMount(async () => {
		const share = document.getElementById("share");
		const shareData = {
			title: "Browsercraft",
			text: "Unmodified Minecraft running in the browser using CheerpJ. Play Minecraft in your browser!",
			url: "https://browsercraft.cheerpj.com",
		};
		if (navigator.canShare?.(shareData)) {
			share.addEventListener("click", () => navigator.share(shareData));
			share.style.display = 'unset';
		}

		await cheerpjInit({
			version: 8,
			javaProperties: ["java.library.path=/app/lwjgl/"],
			libraries: {"libGL.so.1": "/app/lwjgl/gl4es.wasm"},
			enableX11:true,
			preloadResources:{"/lt/8/jre/lib/rt.jar":[0,131072,1310720,1572864,4456448,4849664,5111808,5505024,7995392,8126464,9699328,9830400,9961472,11534336,11665408,12189696,12320768,12582912,13238272,13369344,15073280,15335424,15466496,15597568,15990784,16121856,16252928,16384000,16777216,16908288,17039360,17563648,17694720,17825792,17956864,18087936,18219008,18612224,18743296,18874368,19005440,19136512,19398656,19791872,20054016,20709376,20840448,21757952,21889024,26869760],"/lt/etc/users":[0,131072],"/lt/etc/localtime":[],"/lt/8/jre/lib/cheerpj-awt.jar":[0,131072],"/lt/8/lib/ext/meta-index":[0,131072],"/lt/8/lib/ext":[],"/lt/8/lib/ext/index.list":[],"/lt/8/lib/ext/localedata.jar":[],"/lt/8/jre/lib/jsse.jar":[0,131072,786432,917504],"/lt/8/jre/lib/jce.jar":[0,131072],"/lt/8/jre/lib/charsets.jar":[0,131072,1703936,1835008],"/lt/8/jre/lib/resources.jar":[0,131072,917504,1179648],"/lt/8/jre/lib/javaws.jar":[0,131072,1441792,1703936],"/lt/8/lib/ext/sunjce_provider.jar":[],"/lt/8/lib/security/java.security":[0,131072],"/lt/8/jre/lib/meta-index":[0,131072],"/lt/8/jre/lib":[],"/lt/8/lib/accessibility.properties":[],"/lt/8/lib/fonts/LucidaSansRegular.ttf":[],"/lt/8/lib/currency.data":[0,131072],"/lt/8/lib/currency.properties":[],"/lt/libraries/libGLESv2.so.1":[0,262144],"/lt/libraries/libEGL.so.1":[0,262144],"/lt/8/lib/fonts/badfonts.txt":[],"/lt/8/lib/fonts":[],"/lt/etc/hosts":[],"/lt/etc/resolv.conf":[0,131072],"/lt/8/lib/fonts/fallback":[],"/lt/fc/fonts/fonts.conf":[0,131072],"/lt/fc/ttf":[],"/lt/fc/cache/e21edda6a7db77f35ca341e0c3cb2a22-le32d8.cache-7":[0,131072],"/lt/fc/ttf/LiberationSans-Regular.ttf":[0,131072,262144,393216],"/lt/8/lib/jaxp.properties":[],"/lt/etc/timezone":[],"/lt/8/lib/tzdb.dat":[0,131072]}
		});

		$minecraftClient = new MinecraftClient();
	})
</script>

<h1>Browsercraft</h1>
<div class="container">
	<div class="intro" id="introBrowsercraft">
		<p>
			This is a proof-of-concept demo of Minecraft 1.2.5 running unmodified in the browser.
		</p>

		{#if !$eulaAccepted}
		<p>
			<input
				type="checkbox"
				id="newsletter"
				name="newsletter"
				value="yesdfsdfsdfs"
				bind:checked={$eulaAccepted}
			/>
			Before playing, you have to accept the <a href="https://www.minecraft.net/eula" target="_blank">Minecraft EULA</a>
		</p>
		{/if}

		{#if $eulaAccepted}
			<p>Clicking the button below will download the client from mojang.com.</p>
			<button onclick={() => $minecraftClient.run()}>Play!</button>
		{/if}
		<div class="disclaimer">
			This is not an official Minecraft product. It is not approved by or associated with Mojang or Microsoft.
		</div>
	</div>
	<progress id="progressBar" style="display: none"></progress>
	<div class="display" id="display"></div>
</div>