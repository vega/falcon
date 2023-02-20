<script lang="ts">
	import {
		Falcon,
		type View0DState,
		type View1DState,
		View0D,
		View1D,
		ObjectDB,
	} from "falcon-vis";
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
		await moviesJson();
	});

	let json: Record<string, unknown>[];
	async function moviesJson() {
		json = await fetch("data/movies.json").then((res) => res.json());
		const db = new ObjectDB(json);

		falcon = new Falcon(db);

		count = falcon.linkCount();
		count.addOnChangeListener((state) => {
			countState = state;
		});

		views.push(
			falcon.linkView1DView1D({
				type: "categorical",
				name: "MPAA_Rating",
			})
		);
		views.push(
			falcon.linkView1DView1D({
				type: "continuous",
				name: "US_Gross",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.linkView1DView1D({
				type: "continuous",
				name: "Worldwide_Gross",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.linkView1DView1D({
				type: "continuous",
				name: "Production_Budget",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.linkView1DView1D({
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
			falcon.linkView1DView1D({
				type: "continuous",
				name: "IMDB_Rating",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.linkView1DView1D({
				type: "continuous",
				name: "Rotten_Tomatoes_Rating",
				bins: 25,
				resolution: 400,
			})
		);
		views.push(
			falcon.linkView1DView1D({
				type: "categorical",
				name: "Major_Genre",
			})
		);
		views.push(
			falcon.linkView1DView1D({
				type: "continuous",
				name: "Running_Time_min",
				bins: 25,
				resolution: 400,
			})
		);

		viewStates = new Array(views.length);
		// states will be updated when the view counts change
		views.forEach((view, i) => {
			view.addOnChangeListener((state) => {
				viewStates[i] = state;
			});
		});

		await falcon.initializeAllCounts();
	}
	let instances: Iterable<Record<string, any>>;
	let page = 0;
	let pageSize = 20;
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
					on:select={async (e) => {
						const selection = e.detail;
						if (selection !== null) {
							await view.select(selection);
						} else {
							await view.select();
						}
						instances = await falcon.getEntries({
							offset: 0,
							length: pageSize,
						});
						page = 0;
					}}
					on:mouseenter={async () => {
						await view.prefetch();
					}}
				/>
			</div>
		{/each}
	</div>

	<button
		on:click={async () => {
			page = Math.max(page - pageSize, 0);
			instances = await falcon.getEntries({
				length: pageSize,
				offset: page,
			});

			console.log(page, instances);
		}}>back</button
	>
	<button
		on:click={async () => {
			page += pageSize;
			instances = await falcon.getEntries({
				length: pageSize,
				offset: page,
			});

			console.log(page, instances);
		}}>next</button
	>
	<table>
		{#if instances}
			{[...instances].length}
			{#each [...instances] as instance}
				<tr>
					{#each Object.keys(instance) as key}
						<td>{instance[key]}</td>
					{/each}
				</tr>
			{/each}
		{/if}
	</table>
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
