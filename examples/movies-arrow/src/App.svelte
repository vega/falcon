<script lang="ts">
	import {
		Falcon,
		type View0DState,
		type View1DState,
		View0D,
		View1D,
		ArrowDB,
	} from "falcon2";
	import { tableFromIPC } from "apache-arrow";
	import { onMount } from "svelte";
	import CategoricalHistogram from "./components/CategoricalHistogram.svelte";
	import ContinuousHistogram from "./components/ContinuousHistogram.svelte";

	import logo from "../../../logo/logo.png";

	let falcon: Falcon;

	let ratingView: View1D;
	let grossUSView: View1D;
	let count: View0D;

	let ratingState: View1DState;
	let grossUSState: View1DState;
	let countState: View0DState;

	onMount(async () => {
		await categoricalArrowExampleSetup();
	});

	async function loadArrowFile(url: string) {
		const data = await fetch(url);
		const buffer = await data.arrayBuffer();
		const table = tableFromIPC(buffer);
		return table;
	}

	async function categoricalArrowExampleSetup() {
		const table = await loadArrowFile("data/movies-3k.arrow");
		const db = new ArrowDB(table);
		falcon = new Falcon(db);
		console.log(table.schema.fields.map((f) => f.name));

		ratingView = falcon.view1D({
			type: "categorical",
			name: "MPAA_Rating",
			range: ["G", "PG", "PG-13", "R"],
		});
		ratingView.onChange((state) => {
			ratingState = state;
		});

		grossUSView = falcon.view1D({
			type: "continuous",
			name: "US_Gross",
			bins: 25,
			resolution: 400,
		});
		grossUSView.onChange((state) => {
			grossUSState = state;
		});

		count = falcon.view0D();
		count.onChange((state) => {
			countState = state;
		});

		await falcon.fetchInitialViewCounts();
	}
</script>

<main>
	<div>
		<img src={logo} alt="falcon" width="50px" />
		<h1>Categorical Test</h1>

		<h3>
			<span style="font-weight: 250;">selected</span>
			<code style="color: var(--primary-color);"
				>{countState?.filter.toLocaleString()}</code
			>
		</h3>
	</div>
	<div>
		<ContinuousHistogram
			state={grossUSState}
			on:brush={(e) => {
				const interval = e.detail;
				if (interval !== null) {
					grossUSView.add(interval);
				} else {
					grossUSView.add();
				}
			}}
			on:mouseenter={async () => {
				await grossUSView.prefetch();
			}}
		/>
		<CategoricalHistogram
			state={ratingState}
			on:select={(e) => {
				const selection = e.detail;
				if (selection !== null) {
					ratingView.add(selection);
				} else {
					ratingView.add();
				}
			}}
			on:mouseenter={async () => {
				await ratingView.prefetch();
			}}
		/>
	</div>
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
