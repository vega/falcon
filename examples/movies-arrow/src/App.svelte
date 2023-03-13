<script lang="ts">
	import {
		Falcon,
		type View0DState,
		type View1DState,
		View0D,
		View1D,
		ArrowDB,
		type Dimension,
		smoothBins1D,
	} from "falcon-vis";
	import { onMount } from "svelte";
	import CategoricalHistogram from "./components/CategoricalHistogram.svelte";
	import ContinuousHistogram from "./components/ContinuousHistogram.svelte";

	import logo from "../../../logo/logo.png";

	let falcon: Falcon;

	let countState: View0DState;
	let views: View1D[] = [];
	let viewStates: View1DState[] = [];

	async function compose(falcon: Falcon, view1Ds: Dimension[]) {
		falcon.linkCount((state) => {
			countState = state;
		});

		viewStates = new Array(view1Ds.length);
		const views = view1Ds.map((dim, i) =>
			falcon.linkView1D(dim, (state) => {
				viewStates[i] = state;
			})
		);

		return Promise.all(views);
	}

	let mounted = false;
	onMount(async () => {
		await moviesArrow();
		mounted = true;
	});

	async function moviesArrow() {
		const db = await ArrowDB.fromArrowFile("data/movies-3k.arrow");
		falcon = new Falcon(db);

		views = await compose(falcon, [
			{
				type: "categorical",
				name: "MPAA_Rating",
			},
			{
				type: "continuous",
				name: "US_Gross",
				bins: 25,
				resolution: 400,
			},
			{
				type: "continuous",
				name: "Worldwide_Gross",
				bins: 25,
				resolution: 400,
			},
		]);

		await falcon.initializeAllCounts();
		console.warn = () => {};
	}

	// test the smoothing
	$: {
		if (mounted && falcon) {
			const aContinuousViewState =
				viewStates[
					views.findIndex(
						(view) => view.dimension.type === "continuous"
					)
				];
			testSmoothing(aContinuousViewState);
		}
	}

	function testSmoothing(state: View1DState) {
		const { filter, total, bin } = state;
		// return iterator with 500 bins each with an estimate count from smoothing
		try {
			const output = smoothBins1D({
				bins: bin,
				counts: total,
				numOutputBins: 500,
			});
			console.log(output);
		} catch (e) {}

		console.log(filter, total, bin);
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
