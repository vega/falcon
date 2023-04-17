<script lang="ts">
	import VLContinuous from "./VLContinuous.svelte";
	import type { View1DState } from "falcon-vis";
	export let state: View1DState;

	export let title = "";
	export let width = 400;
	export let height = 125;
	export let countLabel = "Count";
	export let dimLabel = "";
	export let onlyFiltered = false;
	export let type = "quantitative";
	export let timeUnit = "";

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

<VLContinuous
	bins={data}
	on:select
	on:mouseenter
	on:mouseleave
	on:mouseup
	on:mousedown
	on:click
	{timeUnit}
	{type}
	{title}
	{width}
	{height}
	{countLabel}
	{dimLabel}
	{onlyFiltered}
/>
