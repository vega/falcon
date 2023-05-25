<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import type { VegaLiteSpec } from "svelte-vega";
	import { VegaLite } from "svelte-vega";
	import type { View } from "svelte-vega";
	import { primary } from "./colors";

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
	export let labelColor = "black";
	export let backgroundBarColor = "hsla(0, 0%, 0%, 0.07)";
	export let foregroundBarColor = primary;
	export let backgroundColor = "white";
	export let onlyFiltered = false;
	export let type: "quantitative" | "temporal" = "quantitative";
	export let timeUnit = "";

	$: data = {
		table: bins,
	};

	$: spec = {
		$schema: "https://vega.github.io/schema/vega-lite/v5.json",
		description: "A simple bar chart with embedded data.",
		data: {
			name: "table",
		},
		background: "transparent",
		width: width,
		height: height,
		title: { text: title, anchor: "start" },
		layer: [
			{
				params: [
					{
						name: "select",
						select: {
							type: "interval",
							encodings: ["x"],
						},
					},
				],
				mark: { type: "bar", cursor: "col-resize" },
				encoding: {
					x: {
						...(timeUnit ? { timeUnit } : {}),
						// timeUnit: "utcmonthdate"
						field: "bin[0]",
						type,
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
							title: "Count",
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
						...(timeUnit ? { timeUnit } : {}),
						field: "bin[0]",
						type,
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
