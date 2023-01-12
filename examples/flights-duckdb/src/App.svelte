<script lang="ts">
	import { Falcon, DuckDB } from "falcon2";
	import type { View0DState, View1DState, View1D } from "falcon2";

	import * as duckdb from "@duckdb/duckdb-wasm";
	import { onMount } from "svelte";

	import View1DHist from "./components/View1DHist.svelte";
	import logo from "../../../logo/logo.png";

	let totalCountState: View0DState;
	let distanceState: View1DState;
	let distanceView: View1D;
	let airTimeView: View1D;
	let airTimeState: View1DState;

	let falcon: Falcon;
	onMount(async () => {
		// load from duckdb
		const duckdbFlights = await duckdbFromParquet(
			"data/flights-1m.parquet",
			"flights"
		);

		// falcon library
		const falconDuckDB = new DuckDB(duckdbFlights, "flights");
		falcon = new Falcon(falconDuckDB);

		// create views
		const count = falcon.view0D();
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
	});

	function fullUrl(filename: string) {
		return `${window.location.href}${filename}`;
	}

	export async function duckdbFromParquet(filename: string, table = "data") {
		const url = fullUrl(filename);
		const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
		const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
		const worker = await duckdb.createWorker(bundle.mainWorker!);
		const logger = new duckdb.ConsoleLogger();

		const db = new duckdb.AsyncDuckDB(logger, worker);
		await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

		const c = await db.connect();
		await c.query(
			`CREATE VIEW '${table}' AS SELECT * FROM parquet_scan('${url}')`
		);
		const info = await c.query(`PRAGMA table_info('${table}')`);
		console.table((info.toArray() as any).map(Object.fromEntries));

		c.close();
		return db;
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
