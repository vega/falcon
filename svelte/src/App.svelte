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
    const totalCount = new falcon.FalconView({ type: "0D" }, (count) => {
        countValue = count as Bin;
    });

    const distance = new falcon.FalconView(
        {
            type: "1D",
            dimension: {
                name: "DISTANCE",
                bins: 25,
                extent: [0, 4000],
                resolution: 400,
            },
        },
        (counts) => {
            distanceValues = counts as Bin[];
        }
    );

    const departureDelay = new falcon.FalconView(
        {
            type: "1D",
            dimension: {
                name: "DEP_DELAY",
                bins: 25,
                extent: [-20, 60],
                resolution: 400,
            },
        },
        (counts) => {
            departureDelayValues = counts as Bin[];
        }
    );
    falconData.add(distance, totalCount, departureDelay);
</script>

<main>
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
    <p>{countValue["filteredCount"]}</p>
</main>

<style>
</style>
