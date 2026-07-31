<script lang="ts">
	import '../app.css';
	import GhLink from '$lib/GhLink.svelte';
	import GameDisplay from '$lib/GameDisplay.svelte';
	import Footer from '$lib/Footer.svelte';
	import SideParagraph from '$lib/SideParagraph.svelte';
</script>

<main>
	<div class="gh-container">
		<GhLink />
	</div>
	<h1 class="title">BROWSERCRAFT</h1>
	<div class="main-container">
		<GameDisplay />
		<div class="side-column">
			<SideParagraph />
		</div>
	</div>
	<div class="footer-container">
		<Footer />
	</div>
</main>
