<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import type { VegaLiteSpec } from "svelte-vega";
	import { VegaLite } from "svelte-vega";
	import type { View } from "svelte-vega";
	import type { View2DState } from "../../../../falcon/src/core/views";

	const dispatch = createEventDispatcher<{
		brush: [[number, number], [number, number]] | null;
	}>();

	export let state: View2DState;
	export let title = "";
	export let width = 400;
	export let height = 400;
	export let backgroundColor = "hsl(240,23%,9%)";
	export let labelColor = "hsla(0, 0%, 100%, 0.9)";
	export let backgroundBarColor = "hsla(0, 0%, 100%, 0.5)";
	export let foregroundBarColor = "hsla(172, 97%, 45%, 0.95)";
	export let labelX = "axis X";
	export let labelY = "axis Y";
	export let strokeWidth = 1;

	$: rowFormat = convertFormat(state);
	function convertFormat(state: View2DState) {
		let rows = [];
		if (state) {
			for (let i = 0; i < state.binX.length; i++) {
				rows.push({
					x: {
						binStart: state.binX[i].binStart,
						binEnd: state.binX[i].binEnd,
					},
					y: {
						binStart: state.binY[i].binStart,
						binEnd: state.binY[i].binEnd,
					},
					total: state.total[i],
					filter: state.filter[i],
				});
			}
		}
		return rows;
	}
	$: data = {
		table: rowFormat,
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
						name: "brush",
						select: { type: "interval", encodings: ["x", "y"] },
					},
				],
				mark: { type: "circle", strokeWidth: strokeWidth },
				encoding: {
					x: {
						field: "x.binStart",
						bin: { binned: true },
					},
					x2: { field: "x.binEnd" },
					y: {
						field: "y.binStart",
						bin: { binned: true },
					},
					y2: { field: "y.binEnd" },
					size: {
						field: "total",
						type: "quantitative",
					},
					color: { value: backgroundBarColor },
				},
			},
			{
				mark: { type: "circle", strokeWidth: strokeWidth },
				encoding: {
					x: {
						field: "x.binStart",
						bin: { binned: true },
						axis: {
							title: labelX,
							labelColor: labelColor,
							titleColor: labelColor,
						},
					},
					x2: { field: "x.binEnd" },
					y: {
						field: "y.binStart",
						bin: { binned: true },
						axis: {
							title: labelY,
							labelColor: labelColor,
							titleColor: labelColor,
						},
					},
					y2: { field: "y.binEnd" },
					size: { field: "filter", type: "quantitative" },
					color: { value: foregroundBarColor },
				},
			},
		],
	} as VegaLiteSpec;

	let view: View;
	$: if (view) {
		view.addSignalListener("brush", (...s) => {
			if (s.length > 0) {
				const signal = s[1];
				const brush2D = [
					signal["x\\.binStart"],
					signal["y\\.binStart"],
				] as [[number, number], [number, number]];
				if (brush2D[0] && brush2D[1]) {
					dispatch("brush", brush2D);
				} else {
					dispatch("brush", null);
				}
			}
		});
	}
</script>

<div on:mouseenter on:mouseleave class="container">
	<VegaLite
		bind:view
		{data}
		{spec}
		options={{ tooltip: true, actions: false, theme: "dark" }}
	/>
</div>

<style>
	.container {
		display: inline-block;
	}
</style>
