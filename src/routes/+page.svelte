<script lang="ts">
	import '../app.css'; 
	import { onMount } from 'svelte';
	import GameDisplay from '$lib/GameDisplay.svelte';
	import Nav from "labs/packages/global-navbar/src/Nav.svelte"
	import GhLink from '$lib/GhLink.svelte';
	import Footer from "$lib/Footer.svelte";
	import PageControls from '$lib/PageControls.svelte';

	onMount(() => {
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
 	});
</script>

<Nav />

<main>
	<h1 class="mc-title">BROWSERCRAFT</h1>
	<div class="main-container">
		<div class="side-paragraph">
			<h3>What is this</h3>
			<p>
				<b>Browsercraft</b> makes unmodified Minecraft run in the browser using <a href="https://cheerpj.com" target="_blank">CheerpJ</a>, a Java runtime for modern browsers.
			</p>
			<h3>How it works</h3>
			<p>
				<b>CheerpJ</b> is a Java Virtual Machine written in WebAssembly and it runs entirely in your browser. CheerpJ can run any Java application, without modification and without requiring the source code. This demo demonstrate these capabilities by running an older version (1.2.5) of Minecraft and LWJGL entirely in the browser.
			</p>
			<p>
				This project is a work-in-progress and not everything works yet, but there are no fundamental limitations preventing a complete game experience.
			</p>
		</div>
		<div>
			<GameDisplay />
			<PageControls />
		</div>
		<div class="side-paragraph">
			<h3>What this is not</h3>
			<ul>
				<li>A replacement for the official Minecraft. The experience is limited to 3 minutes by design, please refer to <a href="https://www.minecraft.net">minecraft.net</a> for the full game.</li>
				<li><a href="https://classic.minecraft.net" target="_blank">Minecraft Classic</a>, an alpha version of Minecraft playable in the browser</li>
				<li>Minecraft Bedrock Edition</li>
				<li>The latest version of Minecraft. Newer releases of Minecraft use a newer version of Java and OpenGL which we currently do not support.</li>
				<li>A modified version of Minecraft. We do not modify the game in any way, we just run the original JARs.</li>
				<li>A reimplementation of Minecraft in another programming language</li>
			</ul>
		</div>
	</div>
	<GhLink />
</main>

<div class="bottom-container">
	<div class="bottom-paragraph">
		<p>
			Interested in using CheerpJ for your own projects? Take a look at the <a href="https://cheerpj.com/docs/overview" target="_blank">documentation</a> and <a href="https://discord.gg/7xXW6NAdHT" target="_blank">join the Discord server</a> for questions and support.
		</p>
		<p>
			You can also sign-up for the first <a href="https://cheerpj-the-hackathon.devpost.com" target="_blank">CheerpJ Hackathon</a>, held between September and October 2025, with a £500 prize awaiting the winning team.
		</p>
	</div>
	<Footer />
</div>

