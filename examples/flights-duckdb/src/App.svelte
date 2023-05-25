<script lang="ts">
	import { FalconVis, DuckDB } from "falcon-vis";
	import type { View0D, View1D, View0DState, View1DState } from "falcon-vis";
	import GithubButton from "./components/GithubButton.svelte";
	import { tableFromIPC } from "apache-arrow";

	import { onMount } from "svelte";
	import Histogram from "./components/Histogram.svelte";
	import TotalCount from "./components/TotalCount.svelte";
	import UsMapVis from "./components/USMapVis.svelte";

	let falcon: FalconVis;
	let countView: View0D;
	let distanceView: View1D;
	let arrDelayView: View1D;
	let depDelayView: View1D;
	let flightDateView: View1D;
	let originView: View1D;
	let countState: View0DState;
	let distanceState: View1DState;
	let arrDelayState: View1DState;
	let depDelayState: View1DState;
	let flightDateState: View1DState;
	let originState: View1DState;

	onMount(async () => {
		const db = await DuckDB.fromParquetFile("flights-3m.parquet");
		falcon = new FalconVis(db);

		countView = await falcon.view0D((updated) => {
			countState = updated;
		});

		distanceView = await falcon.view1D({
			type: "continuous",
			name: "Distance",
			resolution: 400,
			bins: 20,
		});
		distanceView.onChange((updated) => {
			distanceState = updated;
		});

		arrDelayView = await falcon.view1D({
			type: "continuous",
			name: "ArrDelay",
			resolution: 400,
			range: [-20, 60],
			bins: 20,
		});
		arrDelayView.onChange((updated) => {
			arrDelayState = updated;
		});

		depDelayView = await falcon.view1D({
			type: "continuous",
			name: "DepDelay",
			resolution: 400,
			range: [-20, 60],
			bins: 20,
		});
		depDelayView.onChange((updated) => {
			depDelayState = updated;
		});

		flightDateView = await falcon.view1D({
			type: "continuous",
			name: "FlightDate",
			resolution: 400,
			bins: 20,
			time: true,
		});
		flightDateView.onChange((updated) => {
			flightDateState = updated;
		});

		originView = await falcon.view1D({
			type: "categorical",
			name: "OriginState",
		});
		originView.onChange((updated) => {
			originState = updated;
		});

		await falcon.link();

		entries = await falcon.entries({
			length: numEntries,
			offset: page,
		});
	});

	let page = 0;
	let numEntries = 25;
	let entries: Iterable<Record<string, any>>;
	let resolved = true;
	async function updateEntriesWhenStateChanges(viewStates: View1DState[]) {
		// make a request for entries
		if (falcon && resolved) {
			resolved = false;
			falcon
				.entries({
					length: numEntries,
					offset: page,
				})
				.then((_entries) => {
					resolved = true;
					entries = _entries;
				});
		}
	}
	$: updateEntriesWhenStateChanges([
		distanceState,
		originState,
		arrDelayState,
		depDelayState,
		flightDateState,
	]);
	let tableKeys = [
		"FlightDate",
		"OriginState",
		"DestState",
		"DepDelay",
		"ArrDelay",
		"Distance",
	];
</script>

<svelte:head>
	<title>FalconVis 3 Million Flights</title>
</svelte:head>

<header>
	<div>
		<a href="https://github.com/cmudig/falcon#falconvis" target="_blank">
			<img
				src="https://user-images.githubusercontent.com/65095341/224896033-afc8bd8e-d0e0-4031-a7b2-3857bef51327.svg"
				alt="FalconVis Logo"
				height="60px"
			/>
		</a>
	</div>
	<GithubButton href="https://github.com/cmudig/falcon" width={40} />
</header>

<main>
	<!-- section for all the visualizations -->
	<div id="vis">
		<div id="charts">
			<div id="hists">
				{#if falcon && distanceState}
					<Histogram
						title="Distance Flown"
						dimLabel="Distance in miles"
						bins={distanceState.bin}
						filteredCounts={distanceState.filter}
						totalCounts={distanceState.total}
						on:mouseenter={async () => {
							await distanceView.activate();
						}}
						on:select={async (e) => {
							const selection = e.detail;
							if (selection !== null) {
								await distanceView.select(selection);
							} else {
								await distanceView.select();
							}
						}}
					/>
				{/if}

				{#if falcon && arrDelayState}
					<Histogram
						title="Arrival Flight Delay"
						dimLabel="Delay in + minutes"
						bins={arrDelayState.bin}
						filteredCounts={arrDelayState.filter}
						totalCounts={arrDelayState.total}
						on:mouseenter={async () => {
							await arrDelayView.activate();
						}}
						on:select={async (e) => {
							const selection = e.detail;
							if (selection !== null) {
								await arrDelayView.select(selection);
							} else {
								await arrDelayView.select();
							}
						}}
					/>
				{/if}

				{#if falcon && depDelayState}
					<Histogram
						title="Departure Flight Delay"
						dimLabel="Delay in + minutes"
						bins={depDelayState.bin}
						filteredCounts={depDelayState.filter}
						totalCounts={depDelayState.total}
						on:mouseenter={async () => {
							await depDelayView.activate();
						}}
						on:select={async (e) => {
							const selection = e.detail;
							if (selection !== null) {
								await depDelayView.select(selection);
							} else {
								await depDelayView.select();
							}
						}}
					/>
				{/if}

				{#if falcon && flightDateState}
					<Histogram
						timeUnit=""
						type="temporal"
						title="Flight Date"
						dimLabel="Time of flight"
						bins={flightDateState.bin}
						filteredCounts={flightDateState.filter}
						totalCounts={flightDateState.total}
						on:mouseenter={async () => {
							await flightDateView.activate();
						}}
						on:select={async (e) => {
							const selection = e.detail;
							if (selection !== null) {
								await flightDateView.select(selection);
							} else {
								await flightDateView.select();
							}
						}}
					/>
				{/if}
			</div>

			<div id="maps">
				{#if falcon && originState}
					<UsMapVis
						width={700}
						title="Origin Airport Location by State"
						state={originState}
						on:mouseenter={async () => {
							await originView.activate();
						}}
						on:select={async (e) => {
							const selection = e.detail;
							if (selection !== null) {
								await originView.select(selection);
							} else {
								await originView.select();
							}
						}}
					/>
				{/if}
			</div>
		</div>

		<!-- section for all entries in the table  -->
		<div id="table">
			<div>
				<TotalCount
					filteredCount={countState?.filter ?? 0}
					totalCount={countState?.total ?? 0}
					width={800}
					height={20}
				/>
			</div>
			{#if entries}
				<div>
					<button
						on:click={async () => {
							page = Math.max(page - numEntries, 0);
							entries = await falcon.entries({
								length: numEntries,
								offset: page,
							});
						}}>back</button
					>
					<button
						on:click={async () => {
							page += numEntries;
							entries = await falcon.entries({
								length: numEntries,
								offset: page,
							});
						}}>next</button
					>
				</div>
				<div id="images">
					<table id="table">
						{#if entries && countState}
							<tr>
								{#each tableKeys as key}
									<th>{key}</th>
								{/each}
							</tr>
							{#each Array.from(entries) as instance}
								<tr>
									<td
										>{new Date(
											instance["FlightDate"]
										).toDateString()}</td
									>
									{#each tableKeys.slice(1) as key}
										<td>{instance[key]}</td>
									{/each}
								</tr>
							{/each}
						{/if}
					</table>
				</div>
			{/if}
		</div>
	</div>
</main>

<style>
	:global(:root) {
		--bg-color: white;
		--text-color: rgb(53, 53, 53);
		--primary-color: var(--text-color);
	}
	:global(body, html) {
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
			Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
		margin: 0;
		background-color: var(--bg-color);
		color: var(--text-color);
		/* padding: 5px; */
	}
	main {
		padding: 15px;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background-color: rgb(250, 250, 250);
		border-radius: 5px;
		box-shadow: 0px 0px 3px 1px rgba(0, 0, 0, 0.115);
		margin: 10px;
		margin-bottom: 5px;
		padding: 15px;
		padding-right: 25px;
	}
	#table {
		border: 1px solid lightgrey;
		margin-top: 20px;
		padding: 20px;
		border-radius: 10px;
	}
	#vis {
		width: 100%;
		height: 500px;
	}

	#charts {
		display: flex;
		gap: 20px;
	}
	#maps {
		/* padding: 20px; */
	}
	#hists {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		table-layout: fixed;
	}

	td,
	th {
		border: 1px solid #dddddd;
		text-align: left;
		padding: 8px;
	}
	th {
		font-weight: 500;
		background-color: #f9f9f9;
	}
</style>
