<script lang="ts">
	import View1DHist from "./components/View1DHist.svelte";
	import View2DHeat from "./components/View2DHeat.svelte";
	import { Falcon, DuckDB, duckdbFromParquet } from "../../../falcon/src";
	import { onMount } from "svelte";
	import logo from "../../../logo/logo.png";
	import type {
		View0DState,
		View1DState,
		View2DState,
		View1D,
		View2D,
	} from "../../../falcon/src";

	let totalCountState: View0DState;
	let distanceState: View1DState;
	let distanceView: View1D;
	let delayState: View1DState;
	let delayView: View1D;
	let airTimeView: View1D;
	let airTimeState: View1DState;
	let depDelayVsArrDelayView: View2D;
	let depDelayVsArrDelayState: View2DState;

	let falcon: Falcon;
	onMount(async () => {
		// load from duckdb
		const parquetFlights = fullUrl("data/flights-1m.parquet");
		const tableName = "flights";
		const duckdbFlights = await duckdbFromParquet(
			parquetFlights,
			tableName
		);

		// falcon library
		const falconDuckDB = new DuckDB(duckdbFlights, tableName);
		falcon = new Falcon(falconDuckDB);

		// create views
		const count = falcon.count();
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
		depDelayVsArrDelayView = falcon.view2D([
			{
				type: "continuous",
				name: "DEP_DELAY",
				bins: 25,
				extent: [-20, 60],
				resolution: 500,
			},
			{
				type: "continuous",
				name: "ARR_DELAY",
				bins: 25,
				extent: [-20, 60],
				resolution: 500,
			},
		]);

		// setup onChange functions
		count.onChange((state) => {
			totalCountState = state;
		});
		distanceView.onChange((state) => {
			distanceState = state;
		});
		depDelayVsArrDelayView.onChange((state) => {
			depDelayVsArrDelayState = state;
		});
		airTimeView.onChange((state) => {
			airTimeState = state;
		});

		// get initial counts
		await falcon.all();
	});

	function fullUrl(filename: string) {
		return `${window.location.href}${filename}`;
	}
</script>

<main>
	<div>
		<img src={logo} alt="falcon" width="50px" />
		<h1>Flights</h1>

		<h3>
			<span style="font-weight: 250;">selected</span>
			<code style="color: var(--primary-color);"
				>{totalCountState?.filter.toLocaleString()}</code
			>
		</h3>
	</div>
	<div>
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
	</div>
	<View2DHeat
		state={depDelayVsArrDelayState}
		width={500}
		height={500}
		labelX="Departure Delay"
		labelY="Arrival Delay"
		on:mouseenter={() => {
			depDelayVsArrDelayView.prefetch();
		}}
		on:brush={async (event) => {
			// interact
			const interval = event.detail;
			if (interval !== null) {
				await depDelayVsArrDelayView.add(interval);
			} else {
				await depDelayVsArrDelayView.add();
			}
		}}
	/>
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
