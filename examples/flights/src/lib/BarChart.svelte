<script lang="ts">
    /**
     * Objective: Create a bar chart
     * - display total count and filtered count on top
     * - brush over a region and dispatch it
     * - vertical or horizontal orientation
     * - both categorical and continuous range
     * - And be able to change sizes, colors, etc.
     *
     * I would implement this by doing svelte-vega library
     * and yoinking the spec from old/falcon/src/views
     */

    import { createEventDispatcher } from "svelte";

    // calling dispatch("brush", [0, 10]) will send the data to the parent
    const dispatch = createEventDispatcher<{ brush: [number, number] }>();

    export let title = "Sizes";
    export let width: number;
    export let height: number;
    export let brush: [number, number] | null = null;

    export let bins = [
        { binStart: 0, binEnd: 10, count: 100, filteredCount: 100 },
        { binStart: 10, binEnd: 20, count: 420, filteredCount: 400 },
        { binStart: 30, binEnd: 40, count: 666, filteredCount: 200 },
    ];
    // bins used to create bar chart
</script>

<!-- Put the histogram bar chart here -->
<h3>{title}</h3>
<div id="view-container" style:width="{width}px" style:height="{height}px">
    view container (put chart here)
</div>

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
