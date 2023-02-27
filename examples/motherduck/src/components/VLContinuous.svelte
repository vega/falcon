<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import type { VegaLiteSpec } from "svelte-vega";
	import { VegaLite } from "svelte-vega";
	import type { View } from "svelte-vega";

	const dispatch = createEventDispatcher<{
		select: [number, number] | null;
	}>();

	export let bins = [
		{ bin: [0, 10], count: 200, filteredCount: 150 },
		{ bin: [10, 20], count: 300, filteredCount: 25 },
		{ bin: [20, 30], count: 72, filteredCount: 12 },
	];

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

	$: data = {
		table: bins,
	};

	$: spec = {
		$schema: "https://vega.github.io/schema/vega-lite/v5.json",
		description: "A simple bar chart with embedded data.",
		data: {
			name: "table",
		},
		background: backgroundColor,
		width: width,
		height: height,
		title: title,
		layer: [
			{
				params: [
					{
						name: "select",
						select: { type: "interval", encodings: ["x"] },
					},
				],
				mark: { type: "bar", cursor: "col-resize" },
				encoding: {
					x: {
						field: "bin[0]",
						bin: { binned: true },
						axis: {
							title: dimLabel,
							titleColor: labelColor,
							labelColor: labelColor,
						},
					},
					x2: { field: "bin[1]" },
					y: {
						field: onlyFiltered ? "filteredCount" : "count",
						type: "quantitative",
						axis: {
							title: countLabel,
							titleColor: labelColor,
							tickCount: 3,
							labelColor: labelColor,
						},
					},
					color: { value: backgroundBarColor },
				},
			},
			{
				mark: {
					type: "bar",
				},
				encoding: {
					size: {
						legend: null,
					},
					x: {
						field: "bin[0]",
						bin: { binned: true },
						title: "",
					},
					x2: { field: "bin[1]" },
					y: {
						field: "filteredCount",
						type: "quantitative",
					},
					color: { value: foregroundBarColor },
				},
			},
		],
	} as VegaLiteSpec;

	let view: View;
	let runOnce = false;
	$: if (view && !runOnce) {
		view.addSignalListener("select", (...s) => {
			dispatch("select", s[1][`bin\\.0`] ?? null);
		});
		runOnce = true;
	}
</script>

<div
	on:click
	on:mousedown
	on:mouseup
	on:mouseenter
	on:mouseleave
	class="container"
>
	<VegaLite
		bind:view
		{data}
		{spec}
		options={{ tooltip: true, actions: false, theme: "vox" }}
	/>
</div>

<style>
	.container {
		display: inline-block;
	}
</style>
