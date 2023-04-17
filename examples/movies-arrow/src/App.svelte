<script lang="ts">
	import {
		FalconVis,
		type View0DState,
		type View1DState,
		View1D,
		ArrowDB,
		DuckDB,
	} from "falcon-vis";
	import { onMount } from "svelte";
	import CategoricalHistogram from "./components/CategoricalHistogram.svelte";
	import ContinuousHistogram from "./components/ContinuousHistogram.svelte";

	import logo from "../../../logo/logo.png";

	let index: FalconVis;

	let countState: View0DState;
	let views: View1D[] = [];
	let viewStates: View1DState[] = [];

	let mounted = false;
	onMount(async () => {
		await moviesArrow();
		mounted = true;
	});

	async function moviesArrow() {
		// const db = await DuckDB.fromParquetFile("data/movies-3k.parquet");
		const db = await ArrowDB.fromArrowFile("data/movies-3k.arrow");
		index = new FalconVis(db);

		const count = await index.view0D();
		const rating = await index.view1D({
			type: "categorical",
			name: "MPAA_Rating",
		});
		const usGross = await index.view1D({
			type: "continuous",
			name: "US_Gross",
			resolution: 400,
		});
		const worldGross = await index.view1D({
			type: "continuous",
			name: "Worldwide_Gross",
			resolution: 400,
		});

		views = [rating, usGross, worldGross];

		// then define how the states get updated when those linked views change
		viewStates = new Array(views.length);
		views.forEach((view, i) => {
			view.onChange((state) => {
				viewStates[i] = state;
			});
		});
		count.onChange((state) => {
			countState = state;
		});

		await index.link();

		console.warn = () => {};
	}
</script>

<main>
	<div>
		<img src={logo} alt="falcon" width="50px" />
		<h1>Movies</h1>

		<h3>
			<span style="font-weight: 250;">selected</span>
			<code style="color: var(--primary-color);"
				>{countState?.filter.toLocaleString()}</code
			>
		</h3>
	</div>
	<div class="hist">
		{#each views as view, i}
			{@const state = viewStates[i]}
			{@const Histogram =
				view.dimension.type === "continuous"
					? ContinuousHistogram
					: CategoricalHistogram}
			<div class="hist-baby">
				<Histogram
					{state}
					dimLabel={view.dimension.name.replaceAll("_", " ")}
					on:select={(e) => {
						const selection = e.detail;
						if (selection !== null) {
							view.select(selection);
						} else {
							view.select();
						}
					}}
					on:mouseenter={async () => {
						await view.activate();
					}}
				/>
			</div>
		{/each}
	</div>

	<button
		on:click={async () => {
			views[1].update({
				...views[1].dimension,
				bins: 100,
			});
		}}>update</button
	>
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
	.hist {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
	}
	.hist-baby {
	}
</style>
