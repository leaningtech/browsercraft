<script lang="ts">
	import '../app.css'; 
	import Nav from "labs/packages/global-navbar/src/Nav.svelte"
	import GhLink from '$lib/GhLink.svelte';
	import GameDisplay from '$lib/GameDisplay.svelte';
	import Footer from "$lib/Footer.svelte";
	import SideParagraph from '$lib/SideParagraph.svelte';
</script>

<main>
	<div class="nav-bar">
		<Nav />
	</div>
	<div class="gh-container">
		<GhLink />
	</div>
	<h1 class="title">BROWSERCRAFT</h1>
	<div class="main-container">
		<GameDisplay />
		<SideParagraph />
	</div>
	<div class="footer-container">
		<Footer />
	</div>
</main>
