<script lang="ts">
    import BarChart from "./lib/BarChart.svelte";
    import * as falcon from "../../src/index";

    /**
     * Falcon 2 library example
     */
    const data = new falcon.ArrowDB("flights-10k.arrow");
    const falconData = new falcon.FalconGlobal(data);

    // compose dimensions and add to the falconData to synchronize with other views
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
            },
        },
        (counts) => {
            console.log(counts);
        }
    );

    falconData.add(distanceView, totalCount);
</script>

<main>
    <h1>Falcon Premade components</h1>
    <p>Interactive visualization of flights with</p>

    <div id="views">
        <BarChart width={500} height={175} />
    </div>
</main>

<style>
</style>
