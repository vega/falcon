<script lang="ts">
	import TitleBar from "./TitleBar.svelte";
	import ContinuousHistogram from "./ContinuousHistogram.svelte";

	export let dimLabel = "";
	export let title = "";

	export let totalCounts: Uint32Array;
	export let filteredCounts: Uint32Array;
	export let bins: { binStart: number; binEnd: number }[];
	export let type = "quantitative";
	export let timeUnit = "";
	export let width = 400;
	export let height = 150;

	let selection: null | any[] = null;
</script>

<div id="hist-container">
	<div class="hist">
		<TitleBar {title} {selection} />
		<ContinuousHistogram
			on:mouseenter
			on:mouseleave
			on:mousedown
			on:mouseup
			{dimLabel}
			state={{ bin: bins, filter: filteredCounts, total: totalCounts }}
			on:select
			{type}
			{timeUnit}
			{width}
			{height}
		/>
	</div>
</div>

<style>
	.hist {
		display: inline-block;
	}
	#hist-container {
		display: inline-block;
	}
</style>
