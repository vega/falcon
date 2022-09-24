<script lang="ts">
	import * as falconVis from "../../../src/index";

	// raw data: keys are column names, values are column values
	const table = {
		a: [1, 2, 3, 4],
		b: [3, 4, 5, 6],
		c: ["cat", "dog", "cat", "dog"],
	};

	// create falcon data source
	const falconTable = new falconVis.Falcon(table);

	// create views that can be cross filtered
	const aView = new falconVis.CrossFilter("a"); // a column
	const bView = new falconVis.CrossFilter("b"); // b column

	// add cross filters views to the data + falcon obj
	falconTable.add(aView, bView);

	// interact with views
	aView.filter([1, 2]);

	// or would this be more intuitive?
	falconTable.filter(aView, [1, 2]);
</script>

<main>
	<h1>Flights in Browser</h1>
	<p>Interactive visualization of flights with</p>
</main>

<style>
</style>
