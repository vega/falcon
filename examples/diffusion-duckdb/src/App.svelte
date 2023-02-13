<script lang="ts">
	import {
		Falcon,
		type View0DState,
		type View1DState,
		View0D,
		View1D,
		DuckDB,
		type Dimension,
	} from "falcon2";
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

	function compose(falcon: Falcon, view1Ds: Dimension[]) {
		const count = falcon.view0D();
		count.onChange((state) => {
			countState = state;
		});

		const views = view1Ds.map((dim) => falcon.view1D(dim));
		viewStates = new Array(views.length);

		// states will be updated when the view counts change
		views.forEach((view, i) => {
			view.onChange((state) => {
				viewStates[i] = state;
			});
		});
		return [count, views] as [View0D, View1D[]];
	}

	async function moviesDuckDB() {
		const db = await DuckDB.fromParquetFile(
			fullUrl("data/diffusiondb.parquet")
		);
		falcon = new Falcon(db);

		[count, views] = compose(falcon, [
			{
				type: "continuous",
				name: "image_nsfw",
				bins: 100,
				resolution: 400,
				range: [0, 1.0],
			},
			{
				type: "continuous",
				name: "prompt_nsfw",
				bins: 100,
				resolution: 400,
				range: [0, 1.0],
			},
			{
				type: "categorical",
				name: "width",
				range: [512, 640, 704, 896, 768, 1024, 1280, 832, 960, 576],
			},
			{
				type: "categorical",
				name: "height",
				range: [512, 640, 704, 896, 768, 1024, 1280, 832, 960, 576],
			},
		]);

		await falcon.all();
		entries = await falcon.instances({ length: numEntries });
	}

	let page = 0;
	let numEntries = 20;
	let entries: Iterable<Record<string, any>>;
	let request: Promise<void>;
	let resolved = true;
</script>

<svelte:window on:mouseup={async () => {}} />

<main>
	<div id="falcon-app">
		<div class="hist">
			<div>
				<img src="logo.png" alt="falcon logo" width="50px" />
				<h1>DiffusionDB x Falcon</h1>

				<h3>
					<span style="font-weight: 250;">selected</span>
					<code style="color: var(--primary-color);"
						>{countState?.filter.toLocaleString()}</code
					>
				</h3>
			</div>
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

							if (resolved) {
								resolved = false;
								request = falcon
									.instances({
										length: numEntries,
									})
									.then((d) => {
										resolved = true;
										entries = d;
									});
							}
						}}
						on:mouseenter={async () => {
							await view.prefetch();
						}}
					/>
				</div>
			{/each}
		</div>

		{#if entries}
			<div>
				<button
					on:click={async () => {
						page = Math.max(page - numEntries, 0);
						entries = await falcon.instances({
							length: numEntries,
							offset: page,
						});
					}}>back</button
				>
				<button
					on:click={async () => {
						page += numEntries;
						entries = await falcon.instances({
							length: numEntries,
							offset: page,
						});
					}}>next</button
				>
			</div>
			<div id="images">
				{#each [...entries] as entry}
					{@const filename = entry["image_name"]}
					<img
						src={`https://diffusiondb.m4ke.org/${filename}`}
						title={entry["prompt"]}
						alt="img"
					/>
				{/each}
			</div>
		{/if}
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
		flex-direction: column;
		gap: 20px;
	}
	.hist-baby {
	}

	#images {
		display: flex;
		gap: 20px;
		flex-direction: row;
		flex-wrap: wrap;
		overflow-y: scroll;
	}
	img {
		border: 1px solid transparent;
		border-radius: 5px;
		object-fit: contain;
	}
	#falcon-app {
		display: flex;
		flex-direction: row;
		gap: 30px;
		height: 100vh;
	}
</style>
