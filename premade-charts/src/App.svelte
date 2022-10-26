<script lang="ts">
    import BarChart from "./lib/BarChart.svelte";
    import * as falconVis from "../../src/index";

    function dummyRangeData(length: number, start: number = 0) {
        return new Array(length).fill(0).map((_, i) => i + start);
    }
    const N = 50;
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
