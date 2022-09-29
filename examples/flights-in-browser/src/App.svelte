<script lang="ts">
    import * as falconVis from "../../../";
    import View1D from "./lib/View1D.svelte";

    // raw data: keys are column names, values are column values
    const table = {
        a: [1, 2, 3, 4],
        b: [3, 4, 5, 6],
        c: ["cat", "dog", "cat", "dog"],
    };

    // create falcon global data source from the table
    const falconTable = new falconVis.Falcon(table);

    // create views and connects them for cross filtering later
    // onUpdate callbacks are called when counts update on interaction for all views
    const aView = new falconVis.View({
        dimensions: [{ name: "a" }],
        onUpdate: (...args) => {
            console.log(args);
        },
    }); // a column
    const bView = new falconVis.View({
        dimensions: [{ name: "b" }],
        onUpdate: (...args) => {
            console.log(args);
        },
    }); // b column

    falconTable.add(aView, bView);

    // you can prefetch to speed up the interaction if you know you're about to interact with a filter
    // for example, in the falcon v1, on hover over the chart prefetches, this is the recommended way to do it
    aView.prefetch();

    // you can interact directly with the view and the other view counts update
    aView.filter([1, 2]);
</script>

<main>
    <h1>Flights in Browser</h1>
    <p>Interactive visualization of flights with</p>

    <div id="views">
        <View1D
            width={500}
            height={175}
            on:hover={({ detail }) => console.log(detail)}
        />
    </div>
</main>

<style>
</style>
