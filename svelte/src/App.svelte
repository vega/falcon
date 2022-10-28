<script lang="ts">
    import BarChart from "./lib/BarChart.svelte";
    import * as falcon from "../../src/index";

    /**
     * Falcon 2 library example
     */
    const data = new falcon.ArrowDB("flights-10k.arrow");
    const falconData = new falcon.FalconGlobal(data);

    /**
     * Construct dimensions 0D, 1D, and 2D and add to the falconData
     */
    const totalCount = new falcon.FalconView({ type: "0D" }, (count) => {
        console.log(count);
    });
    const distanceView = new falcon.FalconView(
        {
            type: "1D",
            dimension: {
                name: "DISTANCE",
                bins: 25,
                extent: [0, 4000],
                resolution: 500,
            },
        },
        (counts) => {
            console.log(counts);
        }
    );
    const departureVsArrivalDelaysView = new falcon.FalconView(
        {
            type: "2D",
            dimensions: [
                {
                    name: "DEP_DELAY",
                    bins: 25,
                    extent: [-20, 60],
                    resolution: 500,
                },
                {
                    name: "ARR_DELAY",
                    bins: 25,
                    extent: [-20, 60],
                    resolution: 500,
                },
            ],
        },
        (counts) => {
            console.log(counts);
        }
    );
    falconData.add(distanceView, totalCount, departureVsArrivalDelaysView);
</script>

<main>
    <h1>Falcon Premade components</h1>
    <p>Interactive visualization of flights with</p>

    <div id="views">
        <BarChart width={500} height={175} />
        <button
            on:click={async () => {
                await distanceView.prefetch();
            }}>Prefetch Index</button
        >
    </div>
</main>

<style>
</style>
