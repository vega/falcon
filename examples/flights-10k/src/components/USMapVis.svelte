<script lang="ts">
	import UsMap from "./USMap.svelte";
	import TitleBar from "./TitleBar.svelte";
	import * as d3 from "d3";
	import { states } from "./states";
	import { createEventDispatcher } from "svelte";
	import type { View1DState } from "falcon-vis";
	import Legend from "./Legend.svelte";
	import { primary } from "./colors";

	const dispatch = createEventDispatcher();

	const primaryColorInterpolate = d3.interpolateRgbBasis([
		"rgb(255,255,255)",
		primary,
	]);

	export let state: View1DState;
	export let title: string = "";

	export let numberToColor = (n: number) => primaryColorInterpolate(n);
	export let width = 600;

	let stateToStyle: Map<string, { fill?: string; stroke?: string }> = new Map(
		states.map((state) => [state.id, { fill: "white" }])
	);
	let stateToStyleClone = structuredClone(stateToStyle);

	function copyState(state: View1DState) {
		stateToStyle = updateStateStyleMap(state);
		stateToStyleClone = structuredClone(stateToStyle);
	}
	$: if (state) {
		copyState(state);
	}
	function updateStateStyleMap(viewCounts: View1DState) {
		const stateNames = viewCounts.bin;
		const counts = viewCounts.filter;
		let [_, maxCount] = d3.extent(counts);
		if (maxCount <= 0) {
			maxCount = 1;
		}
		for (let i = 0; i < stateNames.length; i++) {
			const stateName = stateNames[i];
			const count = counts[i];
			const normalizedCount = count / maxCount;
			const color = numberToColor(normalizedCount);
			stateToStyle.set(stateName, {
				...stateToStyle.get(stateName),
				fill: color,
			});
		}

		return stateToStyle;
	}

	let selected = [];
	/**
	 * @TODO fix this mess
	 */
	async function selectMap(selected: string[]) {
		if (selected.length > 0) {
			stateToStyle = structuredClone(stateToStyleClone);
			selected.forEach((state) => {
				stateToStyle.set(state, {
					...stateToStyle.get(state),
					stroke: "hsla(0, 0%, 0%, 0.5)",
				});
			});
			stateToStyle = stateToStyle;
		} else {
			// reset it all to noew stroke
			states.forEach((state) => {
				stateToStyle.set(state.id, {
					fill: stateToStyle.get(state.id).fill,
				});
			});
			stateToStyle = stateToStyle;
		}
	}
</script>

<TitleBar
	{title}
	selection={selected.length > 0 ? selected : null}
	on:reset={() => {
		selected = [];
		// I should remove all the selection
		selectMap(selected);
		dispatch("select", null);
	}}
/>
<UsMap
	on:mouseenter
	on:mouseleave
	{width}
	{stateToStyle}
	on:select={async (e) => {
		selected = e.detail;
		if (e.detail.length > 0) {
			selectMap(selected);
			dispatch("select", selected);
		} else {
			stateToStyle = structuredClone(stateToStyleClone);
			dispatch("select", null);
		}
	}}
/>

<Legend
	title="{title} Density"
	data={state.filter}
	{numberToColor}
	width={200}
	height={10}
/>

<style>
	/*  put stuff here */
</style>
