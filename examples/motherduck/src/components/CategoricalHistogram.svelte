<script lang="ts">
	import VLCategorical from "./VLCategorical.svelte";
	import type { CategoricalView1DState } from "falcon-vis/src/core/views/view1D";

	export let state: CategoricalView1DState;

	export let title = "";
	export let width = 400;
	export let height = 125;
	export let countLabel = "Count";
	export let dimLabel = "";
	export let labelColor = "hsla(0, 0%, 100%, 0.9)";
	export let backgroundBarColor = "hsla(0, 0%, 100%, 0.5)";
	export let foregroundBarColor = "hsla(172, 97%, 45%, 0.95)";
	export let backgroundColor = "hsl(240,23%,9%)";
	export let onlyFiltered = false;

	$: bins =
		state?.bin
			?.filter((b) => b !== null)
			.map((b, i) => ({
				bin: b,
				count: state["total"][i],
				filteredCount: state["filter"][i],
			})) ?? [];
</script>

<VLCategorical
	{bins}
	{title}
	{width}
	{height}
	{countLabel}
	{dimLabel}
	{labelColor}
	{backgroundBarColor}
	{foregroundBarColor}
	{backgroundColor}
	{onlyFiltered}
	on:mouseenter
	on:mouseleave
	on:mouseup
	on:mousedown
	on:click
	on:select
/>
