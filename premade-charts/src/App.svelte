<script lang="ts">
    import BarChart from "./lib/BarChart.svelte";
    import * as falconVis from "../../src/index";

    function dummyRangeData(length: number, start: number = 0) {
        return new Array(length).fill(0).map((_, i) => i + start);
    }
    const N = 50;

    /**
     * FALCON EXAMPLE on regular js array
     */
    const table = new falconVis.VanillaJS({
        a: dummyRangeData(N, 21),
        b: dummyRangeData(N, 52),
    });
    const falconTable = new falconVis.Falcon(table);

    const viewA = new falconVis.View1D({
        dimension: { dtype: "range", name: "a", numBins: 5 },
        onUpdate: ({ counts, name }) => {
            console.log(name, counts);
        },
    });
    const viewB = new falconVis.View1D({
        dimension: { dtype: "range", name: "b", numBins: 5 },
        onUpdate: ({ counts, name }) => {
            console.log(name);
        },
    });

    falconTable.add(viewA, viewB); // connect the views to the db and with each other

    viewA.select([0, 15]);

    $: console.log("%cFalcon Table", "color: lime;", falconTable);
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
