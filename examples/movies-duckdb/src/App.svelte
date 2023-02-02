<script lang="ts">
	import {
		Falcon,
		type View0DState,
		type View1DState,
		View0D,
		View1D,
		DuckDB,
	} from "falcon2";
	import { onMount } from "svelte";
	import CategoricalHistogram from "./components/CategoricalHistogram.svelte";
	import ContinuousHistogram from "./components/ContinuousHistogram.svelte";

	import logo from "../../../logo/logo.png";

	let falcon: Falcon;

	let count: View0D;
	let countState: View0DState;
	let views: View1D[] = [];
	let viewStates: View1DState[] = [];

	onMount(async () => {
		await categoricalArrowExampleSetup();
	});

	function fullUrl(filename: string) {
		return `${window.location.href}${filename}`;
	}

	async function categoricalArrowExampleSetup() {
		const db = await DuckDB.fromParquetURL(
			fullUrl("data/movies-3k.parquet")
		);
		falcon = new Falcon(db);

		count = falcon.view0D();
		count.onChange((state) => {
			countState = state;
		});

		views.push(
			falcon.view1D({
				type: "categorical",
				name: "MPAA_Rating",
			})
		);
		views.push(
			falcon.view1D({
				type: "continuous",
				name: "US_Gross",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.view1D({
				type: "continuous",
				name: "Worldwide_Gross",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.view1D({
				type: "continuous",
				name: "Production_Budget",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.view1D({
				type: "categorical",
				name: "Distributor",
				range: [
					"Warner Bros.",
					"Sony Pictures",
					"Paramount Pictures",
					"Universal",
					"Walt Disney Pictures",
					"20th Century Fox",
					"MGM",
					"Miramax",
					"New Line",
					"Lionsgate",
					"Sony Pictures Classics",
					"Fox Searchlight",
					"Dreamworks SKG",
					"Focus Features",
					"Weinstein Co.",
				],
			})
		);
		views.push(
			falcon.view1D({
				type: "continuous",
				name: "IMDB_Rating",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.view1D({
				type: "continuous",
				name: "Rotten_Tomatoes_Rating",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.view1D({
				type: "categorical",
				name: "Major_Genre",
			})
		);
		views.push(
			falcon.view1D({
				type: "continuous",
				name: "Running_Time_min",
				bins: 25,
				resolution: 400,
			})
		);

		viewStates = new Array(views.length);
		// states will be updated when the view counts change
		views.forEach((view, i) => {
			view.onChange((state) => {
				viewStates[i] = state;
			});
		});

		await falcon.fetchInitialViewCounts();
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
							view.add(selection);
						} else {
							view.add();
						}
					}}
					on:mouseenter={async () => {
						await view.prefetch();
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
