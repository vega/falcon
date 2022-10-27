<script lang="ts">
    import BarChart from "./lib/BarChart.svelte";
    import * as falcon from "../../src/index";

    const data = new falcon.ArrowDB("flights-10k.arrow");
    const falconData = new falcon.Falcon(data);

    console.log(falconData);
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
