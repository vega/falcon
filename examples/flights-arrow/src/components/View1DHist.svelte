<script lang="ts">
	import VegaLiteHistogram from "./VegaLiteHistogram.svelte";
	import type { View1DState } from "falcon2";
	export let state: View1DState;

	export let title = "";
	export let width = 400;
	export let height = 125;
	export let countLabel = "Count";
	export let dimLabel = "";

	$: data = convertFormat(state);

	function convertFormat(state: View1DState) {
		let newBins = [];
		if (state) {
			for (let i = 0; i < state.bin.length; i++) {
				newBins.push({
					bin: [state.bin[i].binStart, state.bin[i].binEnd],
					count: state.total[i],
					filteredCount: state.filter[i],
				});
			}
		}
		return newBins;
	}
</script>

<VegaLiteHistogram
	bins={data}
	on:brush
	on:mouseenter
	on:mouseleave
	{title}
	{width}
	{height}
	{countLabel}
	{dimLabel}
/>
