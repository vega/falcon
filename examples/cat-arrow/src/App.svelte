<script lang="ts">
	import { Falcon, ObjectDB } from "falcon2";
	import { onMount } from "svelte";

	import logo from "../../../logo/logo.png";

	let falcon: Falcon;
	let data = {
		name: ["chicken", "egg", "egg", "chicken", "egg"],
		isDead: [1, 0, 1, 0, 0],
		weight: [100, 25, 31, 40, 5],
	};

	onMount(async () => {
		await categoricalArrowExampleSetup();
	});

	async function categoricalArrowExampleSetup() {
		const db = new ObjectDB(data);
		falcon = new Falcon(db);

		console.log(falcon);
	}
</script>

<main>
	<div>
		<img src={logo} alt="falcon" width="50px" />
		<h1>Categorical Test</h1>

		<!-- <h3>
			<span style="font-weight: 250;">selected</span>
			<code style="color: var(--primary-color);"
				>{totalCountState?.filter.toLocaleString()}</code
			>
		</h3> -->
	</div>
	<div>put hists here</div>
</main>

<style>
	:global(:root) {
		--bg-color: hsl(240, 23%, 9%);
		--primary-color: #00e6c7;
		--text-color: white;
	}
	:global(body, html) {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
			Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
		margin: 0;
		background-color: var(--bg-color);
		color: var(--text-color);
		padding: 20px;
	}
	code {
		font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New",
			monospace;
	}
</style>
