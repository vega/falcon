<script lang="ts">
	import {
		FalconVis,
		type View0DState,
		type View1DState,
		View1D,
		JsonDB,
	} from "falcon-vis";
	import { onMount } from "svelte";
	import CategoricalHistogram from "./components/CategoricalHistogram.svelte";
	import ContinuousHistogram from "./components/ContinuousHistogram.svelte";

	console.warn = () => {}; //I live life on the edge

	let index: FalconVis;

	let countState: View0DState;
	let views: View1D[] = [];
	let viewStates: View1DState[] = [];

	let mounted = false;
	onMount(async () => {
		await moviesJson();
		mounted = true;
	});

	async function moviesJson() {
		const moviesJson = await (await fetch("movies-3k.json")).json();
		// convert the string dates into Date objects
		for (let i = 0; i < moviesJson.length; i++) {
			moviesJson[i]["Release_Date"] = new Date(
				moviesJson[i]["Release_Date"]
			);
		}

		const db = new JsonDB(moviesJson);
		index = new FalconVis(db);

		const count = await index.view0D();
		const mpaa = await index.view1D({
			type: "categorical",
			name: "MPAA_Rating",
		});
		const usGross = await index.view1D({
			type: "continuous",
			name: "US_Gross",
			resolution: 400,
			bins: 20,
		});
		const worldGross = await index.view1D({
			type: "continuous",
			name: "Worldwide_Gross",
			resolution: 400,
			bins: 20,
		});
		const rottenTomatoesRating = await index.view1D({
			type: "continuous",
			name: "Rotten_Tomatoes_Rating",
			resolution: 400,
			bins: 20,
		});
		const imdbRating = await index.view1D({
			type: "continuous",
			name: "IMDB_Rating",
			resolution: 400,
			bins: 20,
		});
		const releaseDate = await index.view1D({
			type: "continuous",
			name: "Release_Date",
			resolution: 400,
			bins: 20,
			time: true,
		});
		const budget = await index.view1D({
			type: "continuous",
			name: "Production_Budget",
			resolution: 400,
			bins: 20,
		});
		const runningTime = await index.view1D({
			type: "continuous",
			name: "Running_Time_min",
			resolution: 400,
			bins: 20,
		});
		const genre = await index.view1D({
			type: "categorical",
			name: "Major_Genre",
			range: [
				"Action",
				"Adventure",
				"Comedy",
				"Drama",
				"Documentary",
				"Horror",
				"Musical",
				"Romantic Comedy",
				"Thriller/Suspense",
				"Western",
			],
		});
		const distributor = await index.view1D({
			type: "categorical",
			name: "Distributor",
			range: [
				"20th Century Fox",
				"Dreamworks SKG",
				"Focus Features",
				"Fox Searchlight",
				"Lionsgate",
				"MGM",
				"Miramax",
				"New Line",
				"Paramount Pictures",
				"Sony Pictures",
				"Sony Pictures Classics",
				"Universal",
				"Walt Disney Pictures",
				"Warner Bros.",
			],
		});

		views = [
			mpaa,
			usGross,
			worldGross,
			imdbRating,
			rottenTomatoesRating,
			releaseDate,
			budget,
			runningTime,
			genre,
			distributor,
		];

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
	}
</script>

<main>
	<div>
		<a href="https://github.com/cmudig/falcon" target="_blank">
			<img
				src="https://user-images.githubusercontent.com/65095341/224896033-afc8bd8e-d0e0-4031-a7b2-3857bef51327.svg"
				alt="falcon"
				width="400px"
			/>
		</a>
		<h3 class="description">
			<a href="https://github.com/cmudig/falcon" target="_blank"
				>FalconVis</a
			>
			cross-filtering with
			<a href="https://vega.github.io/vega-lite/">Vega Lite</a>
			to explore the
			<a
				href="https://github.com/vega/vega-datasets/blob/main/data/movies.json"
				target="_blank">movies</a
			> dataset.
		</h3>
		<details>
			<summary>Instructions</summary>

			<div class="description">
				<img src="demo-movies.gif" alt="demo" />
			</div>

			<div class="description">
				Filter a categorical chart by <kbd>click</kbd>ing on a bar or
				selecting multiple by <kbd>shift</kbd> + <kbd>click</kbd>ing.
			</div>
			<div class="description">
				Filter a continuous chart by <kbd>dragging</kbd> across a range
				and by
				<kbd>dragging</kbd> the window around.
			</div>
			<div class="description">
				Reset a filter by <kbd>click</kbd>ing outside the selection.
			</div>
		</details>

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
					type={"time" in view.dimension
						? "temporal"
						: "quantitative"}
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
	a {
		color: var(--primary-color);
	}
	code {
		font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New",
			monospace;
	}
	h1 {
		font-weight: 400;
		margin-top: 0;
	}
	h3 {
		font-weight: 400;
	}
	.hist {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
	}
	/* credit to https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd */
	kbd {
		background-color: #eee;
		border-radius: 3px;
		border: 1px solid #b4b4b4;
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2),
			0 2px 0 0 rgba(255, 255, 255, 0.7) inset;
		color: #333;
		display: inline-block;
		font-size: 0.85em;
		font-weight: 700;
		line-height: 1;
		padding: 2px 4px;
		white-space: nowrap;
	}
	summary:hover {
		cursor: pointer;
	}
</style>
