<script lang="ts">
	import HackathonInfo from '$lib/HackathonInfo.svelte';
</script>

<div class="side-paragraph">
	<div>
		<HackathonInfo />
		<h3>What is this</h3>
		<p>
			Browsercraft runs unmodified Minecraft (version 1.2.5) in the browser using <a href="https://cheerpj.com" target="_blank">CheerpJ</a>, a Java runtime for modern browsers. The experience is intentionally limited to 3 minutes; please refer to <a href="https://www.minecraft.net">minecraft.net</a> for the full game.
		</p>
		<h3>What this is not</h3>
		<p>It is not a replacement for the official Minecraft, nor a reimplementation in another programming language. This is also not a modified version of the game: we do not alter the code in any way, we simply run the original JARs.</p>
		<h3>How it works</h3>
		<p>
			<b>CheerpJ</b> is a Java Virtual Machine written in WebAssembly that runs entirely in your browser. It can execute any Java application without modification and without requiring the source code. This demo demonstrates those capabilities by running an older version (1.2.5) of Minecraft and LWJGL entirely in the browser.
		</p>
	</div>
</div>
