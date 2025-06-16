<script lang="ts">
	import '../app.css';
	import Footer from "$lib/Footer.svelte";
	import GameDisplay from "$lib/GameDisplay.svelte";
	import Nav from "labs/packages/global-navbar/src/Nav.svelte";

</script>

<header class="height 10%">
	<Nav />
</header>
<main>
	<GameDisplay></GameDisplay>
</main>
<Footer></Footer>
