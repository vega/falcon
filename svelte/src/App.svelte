<script lang="ts">
    import VegaLiteHistogram from "./components/VegaLiteHistogram.svelte";
    import { Falcon, ArrowDB, FalconView } from "../../src/index";
    import { tableFromIPC } from "apache-arrow";
    import { onMount } from "svelte";

    // svelte variables
    let countValue = {};
    let distanceValues = [];
    let departureDelayValues = [];
    let arrivalDelayValues = [];

    // view declarations
    let count: FalconView<string, string>;
    let distance: FalconView<string, string>;
    let departureDelay: FalconView<string, string>;
    let arrivalDelay: FalconView<string, string>;

    // listeners
    let disposeCount: CallableFunction;
    let disposeDistance: CallableFunction;
    let disposeDepartureDelay: CallableFunction;
    let disposeArrivalDelay: CallableFunction;

    onMount(async () => {
        // Arrow Data
        const data = await fetch("flights-10k.arrow");
        const buffer = await data.arrayBuffer();
        const table = tableFromIPC(buffer);

        // falcon library
        const falconArrow = new ArrowDB(table);
        const falcon = new Falcon(falconArrow);

        // add views
        count = falcon.count();
        distance = falcon.addView({
            name: "DISTANCE",
            bins: 25,
            extent: [0, 4000],
            resolution: 400,
        });
        departureDelay = falcon.addView({
            name: "DEP_DELAY",
            bins: 25,
            extent: [-20, 60],
            resolution: 400,
        });
        arrivalDelay = falcon.addView({
            name: "ARR_DELAY",
            bins: 25,
            extent: [-20, 60],
            resolution: 400,
        });

        // onChange listeners
        disposeCount = count.onChange((bin) => {
            countValue = bin;
        });
        disposeDistance = distance.onChange((bins) => {
            distanceValues = bins;
        });
        disposeDepartureDelay = departureDelay.onChange((bins) => {
            departureDelayValues = bins;
        });
        disposeArrivalDelay = arrivalDelay.onChange((bins) => {
            arrivalDelayValues = bins;
        });

        // update all counts to start
        falcon.all();
    });
</script>

<main>
    <VegaLiteHistogram
        bins={arrivalDelayValues}
        dimLabel="Arrival Delay"
        width={400}
        on:mouseenter={() => {
            arrivalDelay.prefetch();
        }}
        on:brush={(event) => {
            const interval = event.detail;
            if (interval !== null) {
                arrivalDelay.brush(interval);
            } else {
                arrivalDelay.brush();
            }
        }}
    />
    <VegaLiteHistogram
        bins={departureDelayValues}
        dimLabel="Departure Delay"
        width={400}
        on:mouseenter={() => {
            departureDelay.prefetch();
        }}
        on:brush={(event) => {
            const interval = event.detail;
            if (interval !== null) {
                departureDelay.brush(interval);
            } else {
                departureDelay.brush();
            }
        }}
    />

    <VegaLiteHistogram
        bins={distanceValues}
        dimLabel="Distance"
        width={400}
        on:mouseenter={() => {
            distance.prefetch();
        }}
        on:brush={(event) => {
            const interval = event.detail;
            if (interval !== null) {
                distance.brush(interval);
            } else {
                distance.brush();
            }
        }}
    />
    <div>
        <p>Selected: {Number(countValue["filteredCount"]).toLocaleString()}</p>
    </div>
    <div>
        <p>out of {Number(countValue["count"]).toLocaleString()}</p>
    </div>
    <button
        on:click={() => {
            disposeArrivalDelay();
        }}>dispose arrival delay listener</button
    >
</main>

<style>
    :global(body, html) {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
        margin: 0;
    }
</style>
