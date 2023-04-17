<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import type { VegaLiteSpec } from "svelte-vega";
	import { VegaLite } from "svelte-vega";
	import type { View } from "svelte-vega";

	const dispatch = createEventDispatcher<{
		select: any[] | null;
	}>();

	export let bins = [
		{ bin: "chicken", count: 200, filteredCount: 150 },
		{ bin: "dog", count: 300, filteredCount: 25 },
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
		description: "A categorical bar chart",
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
						select: { type: "point", encodings: ["x"] },
					},
				],
				mark: { type: "bar", cursor: "pointer" },
				encoding: {
					x: {
						field: "bin",
						axis: {
							title: dimLabel,
							titleColor: labelColor,
							labelColor: labelColor,
						},
					},
					y: {
						field: onlyFiltered ? "filteredCount" : "count",
						type: "quantitative",
						axis: {
							title: countLabel,
							titleColor: labelColor,
							labelColor: labelColor,
							tickCount: 3,
						},
					},
					color: { value: backgroundBarColor },
					stroke: {
						condition: [
							{
								param: "select",
								empty: false,
								value: labelColor,
							},
						],
						value: "transparent",
					},
					strokeWidth: {
						condition: [
							{
								param: "select",
								empty: false,
								value: 3,
							},
						],
						value: 0,
					},
				},
				color: { value: foregroundBarColor },
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
						field: "bin",
						title: "",
					},
					y: {
						field: "filteredCount",
						type: "quantitative",
						title: "",
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
			let out: any[] | null;
			if (s[1] && "bin" in s[1]) {
				out = s[1]["bin"];
			} else {
				out = null;
			}
			dispatch("select", out);
		});
		runOnce = true;
	}
</script>

<div
	on:click
	on:mouseup
	on:mousedown
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
