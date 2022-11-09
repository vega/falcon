<script lang="ts">
    import VegaLiteHistogram from "./components/VegaLiteHistogram.svelte";
    import * as falcon from "../../src/index";

    type Bin = {
        filteredCount: number;
        count: number;
        bin: number;
    };
    // svelte variables
    let countValue = {};
    let distanceValues = [];
    let departureDelayValues = [];
    let arrivalDelayValues = [];

    /**
     * Falcon 2 library example
     */
    const data = new falcon.ArrowDB("flights-10k.arrow");
    const falconData = new falcon.FalconGlobal(data);

    /**
     * View definitions
     */
    const totalCount = new falcon.FalconView({ type: "0D" });
    totalCount.onChange((count) => {
        countValue = count;
    });

    const distance = new falcon.FalconView({
        type: "1D",
        dimension: {
            name: "DISTANCE",
            bins: 25,
            extent: [0, 4000],
            resolution: 400,
        },
    });
    distance.onChange((counts) => {
        distanceValues = counts;
    });

    const departureDelay = new falcon.FalconView({
        type: "1D",
        dimension: {
            name: "DEP_DELAY",
            bins: 25,
            extent: [-20, 60],
            resolution: 400,
        },
    });
    departureDelay.onChange((counts) => {
        departureDelayValues = counts;
    });

    const arrivalDelay = new falcon.FalconView({
        type: "1D",
        dimension: {
            name: "ARR_DELAY",
            bins: 25,
            extent: [-20, 60],
            resolution: 400,
        },
    });
    const disposeArrivalDelay = arrivalDelay.onChange((counts) => {
        arrivalDelayValues = counts;
    });

    falconData.add(distance, totalCount, departureDelay, arrivalDelay);
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
