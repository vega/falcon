<script lang="ts">
    import Hover from "./Hover.svelte";

    export let title = "Sizes";
    export let width: number;
    export let height: number;

    export let bins = [
        { binStart: 0, binEnd: 10, count: 100, filteredCount: 100 },
        { binStart: 10, binEnd: 20, count: 420, filteredCount: 400 },
        { binStart: 30, binEnd: 40, count: 666, filteredCount: 200 },
    ];
    // bins used to create bar chart
</script>

<h3>{title}</h3>
<Hover on:hover>
    <div id="view-container" style:width="{width}px" style:height="{height}px">
        view container (put chart here)
    </div>
</Hover>

<!-- You can comment this out later -->
{#each bins as bin}
    <pre>
		{JSON.stringify(bin, null, 2)}
	</pre>
{/each}

<style>
    #view-container {
        outline: 1px solid grey;
    }
</style>
