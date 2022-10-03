<script lang="ts">
    import BarChart from "./lib/BarChart.svelte";
    import * as falconVis from "../../src/index";

    const table = {
        a: [1, 2, 3, 4],
        b: [3, 4, 5, 6],
        c: ["cat", "dog", "cat", "dog"],
    };

    const falconTable = new falconVis.Falcon(table);
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
