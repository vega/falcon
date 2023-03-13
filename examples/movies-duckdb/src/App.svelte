<script lang="ts">
	import {
		Falcon,
		type View0DState,
		type View1DState,
		View0D,
		View1D,
		DuckDB,
		ArrowDB,
	} from "falcon-vis";
	import type { Row } from "falcon-vis/src/core/iterator";
	import { onMount } from "svelte";
	import CategoricalHistogram from "./components/CategoricalHistogram.svelte";
	import ContinuousHistogram from "./components/ContinuousHistogram.svelte";

	let falcon: Falcon;

	let count: View0D;
	let countState: View0DState;
	let views: View1D[] = [];
	let viewStates: View1DState[] = [];

	onMount(async () => {
		await moviesDuckDB();
	});

	function fullUrl(filename: string) {
		return `${window.location.href}${filename}`;
	}

	async function moviesDuckDB() {
		const db = await DuckDB.fromParquetFile(
			fullUrl("data/movies-3k.parquet")
		);
		// const db = await ArrowDB.fromArrowFile("data/movies-3k.arrow");
		falcon = new Falcon(db);

		count = await falcon.linkCount((state) => {
			countState = state;
		});

		views.push(
			await falcon.linkView1D({
				type: "continuous",
				name: "IMDB_Rating",
				bins: 25,
				resolution: 400,
			})
		);
		// views.push(
		// 	await falcon.linkView1D({
		// 		type: "categorical",
		// 		name: "MPAA_Rating",
		// 	})
		// );
		views.push(
			await falcon.linkView1D({
				type: "continuous",
				name: "Rotten_Tomatoes_Rating",
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
		await views[0].activate();
		await views[0].select([6.41, 8.52]);
		falcon.filters = falcon.filters;
		instances = await falcon.getEntries({
			offset: 0,
			length: pageSize,
		});
	}

	console.warn = () => {};
	let instances: Iterable<Row>;
	let resolved = true;
	let request: Promise<void>;
	let page = 0;
	let pageSize = 20;
</script>

<main>
	<div>
		<img src="logo.png" alt="falcon logo" width="50px" />
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
						falcon.filters = falcon.filters;
						if (selection !== null) {
							// console.log(selection);
							await view.select(selection);
						} else {
							await view.select();
						}
						if (resolved) {
							resolved = false;
							request = falcon
								.getEntries({
									length: pageSize,
								})
								.then((d) => {
									resolved = true;
									instances = d;
								});
						}
					}}
					on:mouseenter={async () => {
						await view.prefetch();
					}}
				/>
			</div>
		{/each}
		{#if falcon}
			here
			{#each [...falcon.filters.entries()] as [dim, filter]}
				<div>
					<h3>{dim.name}</h3>
					<pre>{JSON.stringify(filter, null, 2)}</pre>
				</div>
			{/each}
		{/if}
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
			{@const keys = views.map((v) => v.dimension.name)}
			<tr>
				{#each keys as key}
					<th>{key}</th>
				{/each}
			</tr>
			{#each [...instances] as instance}
				<tr>
					{#each keys as key}
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
