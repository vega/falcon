<script lang="ts">
	import {
		Falcon,
		ObjectDB,
		type View0DState,
		type View1DState,
		View0D,
		View1D,
	} from "falcon2";
	import type { Dimension } from "falcon2";
	import { onMount } from "svelte";
	import CategoricalHistogram from "./components/CategoricalHistogram.svelte";

	import logo from "../../../logo/logo.png";
	import View1DHist from "./components/View1DHist.svelte";

	let falcon: Falcon;
	let data = {
		organism: ["dog", "chicken", "chicken", "dog", "chicken", "dog"],
		isDead: [1, 0, 1, 0, 0, 1],
		weight: [100.0, 25.0, 31.0, 40.0, 5.0, 101.0],
	};
	let weightsView: View1D;
	let organismView: View1D;
	let totalCountView: View0D;

	let weightsState: View1DState;
	let organismState: View1DState;
	let totalCountState: View0DState;

	onMount(async () => {
		await categoricalArrowExampleSetup();
	});

	async function categoricalArrowExampleSetup() {
		const db = new ObjectDB(data);
		falcon = new Falcon(db);

		// create categorical dimension
		const organism = {
			type: "categorical",
			name: "organism",
			range: ["dog", "chicken"],
		} as Dimension;

		const weights = {
			type: "continuous",
			name: "weight",
			resolution: 400,
			bins: 10,
			range: [0, 125],
		} as Dimension;

		organismView = falcon.view1D(organism);
		weightsView = falcon.view1D(weights);
		totalCountView = falcon.view0D();

		organismView.onChange((s) => {
			organismState = s;
		});
		weightsView.onChange((s) => {
			weightsState = s;
		});
		totalCountView.onChange((s) => {
			totalCountState = s;
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
				>{totalCountState?.filter.toLocaleString()}</code
			>
		</h3>
	</div>
	<div>
		<CategoricalHistogram
			bins={organismState?.bin?.map((b, i) => ({
				bin: b,
				count: organismState["total"][i],
				filteredCount: organismState["filter"][i],
			})) ?? []}
			on:select={(e) => {
				console.log(e.detail);
			}}
		/>
		<View1DHist
			state={weightsState}
			dimLabel="weights"
			width={400}
			on:mouseenter={async () => {
				await weightsView.prefetch();
			}}
			on:brush={async (event) => {
				// interact
				const interval = event.detail;
				if (interval !== null) {
					await weightsView.add(interval);
				} else {
					await weightsView.add();
				}
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
