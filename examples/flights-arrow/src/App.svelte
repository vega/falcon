<script lang="ts">
	import { Falcon, ArrowDB } from "falcon2";
	import * as dev from "../../../falcon/src/core/db/arrow";
	import {
		type View0DState,
		type View1DState,
		View1D,
		View0D,
	} from "falcon2";
	import type { Dimension } from "../../../falcon/src/core/dimension";

	import { tableFromIPC } from "apache-arrow";
	import { onMount } from "svelte";

	import View1DHist from "./components/View1DHist.svelte";
	import logo from "../../../logo/logo.png";

	// interactive views
	let count: View0D;
	let distanceView: View1D;
	let airTimeView: View1D;

	// what the views return after interaction
	let totalCountState: View0DState;
	let distanceState: View1DState;
	let airTimeState: View1DState;

	let falcon: Falcon;
	onMount(async () => {
		// await flightsArrowExampleSetup();
		await test();
	});

	async function test() {
		// load data
		const table = await loadArrowFile("data/flights-10k.arrow");
		const arrowDB = new dev.ArrowDB(table);
		const oldArrowDB = new ArrowDB(table);

		// console.log({ table, arrowDB, oldArrowDB });

		// view0D count / length
		const count = arrowDB.length();
		const oldCount = oldArrowDB.length();

		// console.log({ count, oldCount });

		// extent
		const dimension = {
			type: "continuous",
			name: "AIR_TIME",
			bins: 25,
			extent: [0, 500],
			resolution: 400,
			binConfig: {
				start: 0,
				stop: 500,
				step: 20,
			},
		} as Dimension;

		const extent = arrowDB.extent(dimension);
		const oldExtent = oldArrowDB.getDimensionExtent(dimension);

		// console.log({ extent, oldExtent });

		// count 1D
		const falcon = {} as Falcon;
		const airTimeView = new View1D(falcon, dimension);

		const oldHist1D = oldArrowDB.histogram(dimension);
		const hist1D = arrowDB.loadAll1D(airTimeView);

		console.log({ airTimeView, oldHist1D, hist1D });
	}

	async function loadArrowFile(url: string) {
		const data = await fetch(url);
		const buffer = await data.arrayBuffer();
		const table = tableFromIPC(buffer);
		return table;
	}
	async function flightsArrowExampleSetup() {
		const table = await loadArrowFile("data/flights-1m.arrow");

		// falcon library
		const falconArrow = new ArrowDB(table);
		falcon = new Falcon(falconArrow);

		// create views and save them
		// you directly interact with these objects
		count = falcon.view0D();
		airTimeView = falcon.view1D({
			type: "continuous",
			name: "AIR_TIME",
			bins: 25,
			extent: [0, 500],
			resolution: 400,
		});
		distanceView = falcon.view1D({
			type: "continuous",
			name: "DISTANCE",
			bins: 25,
			extent: [0, 4000],
			resolution: 400,
		});

		// setup onChange functions
		count.onChange((state) => {
			totalCountState = state;
		});
		distanceView.onChange((state) => {
			distanceState = state;
		});
		airTimeView.onChange((state) => {
			airTimeState = state;
		});

		// get initial counts
		await falcon.init();
	}
</script>

<main>
	<div>
		<img src={logo} alt="falcon" width="50px" />
		<h1>Flights</h1>

		<!-- <h3>
			<span style="font-weight: 250;">selected</span>
			<code style="color: var(--primary-color);"
				>{totalCountState?.filter.toLocaleString()}</code
			>
		</h3> -->
	</div>
	<!-- <div>
		<View1DHist
			state={airTimeState}
			dimLabel="Air Time"
			width={400}
			on:mouseenter={() => {
				airTimeView.prefetch();
			}}
			on:brush={async (event) => {
				// interact
				const interval = event.detail;
				if (interval !== null) {
					await airTimeView.add(interval);
				} else {
					await airTimeView.add();
				}
			}}
		/>
		<View1DHist
			state={distanceState}
			dimLabel="Distance"
			width={400}
			on:mouseenter={() => {
				distanceView.prefetch();
			}}
			on:brush={async (event) => {
				// interact
				const interval = event.detail;
				if (interval !== null) {
					await distanceView.add(interval);
				} else {
					await distanceView.add();
				}
			}}
		/>
	</div> -->
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
