<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { states } from "./states";
	import StatePath from "./StatePath.svelte";

	const dispatch = createEventDispatcher();

	export let stateToStyle: Map<string, { fill?: string; stroke?: string }> =
		new Map([["CA", { fill: "red" }]]);
	export let width = 500;
	export let defaultFill = "hsla(0, 0%, 0%, 0.025)";
	export let defaultStyle = {
		stroke: "hsla(0, 0%, 0%, 0.075)",
		fill: defaultFill,
	};
	export let selected = [];
	let holdingShift = false;
</script>

<svelte:window
	on:keyup={(e) => {
		if (e.key === "Shift") {
			holdingShift = false;
		}
	}}
	on:keydown={(e) => {
		if (e.key === "Shift") {
			holdingShift = true;
		}
	}}
/>

<svg
	{width}
	viewBox="0 0 468 280"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	on:mouseenter
	on:mouseleave
>
	<!-- TODO create a map -> from the d  -->
	<g id="usa" clip-path="url(#clip0_1_121)">
		{#each states as state}
			{@const style = stateToStyle.get(state.id) ?? defaultStyle}
			<StatePath
				title={state.id}
				d={state.d}
				fill={style.fill ?? defaultStyle.fill}
				stroke={style.stroke ?? defaultStyle.stroke}
				on:click={() => {
					// if we hold shift, can select multiple or deselect multiple if they are already selected
					const alreadySelected = selected.includes(state.id);
					if (holdingShift) {
						if (alreadySelected) {
							selected = selected.filter((s) => s !== state.id);
						} else {
							// if not, add it to the selection!
							selected.push(state.id);
							selected = selected;
						}
					} else {
						// if we don't hold shift, can only select and deselect one
						if (alreadySelected && selected.length === 1) {
							selected = [];
						} else {
							selected = [state.id];
						}
					}

					dispatch("select", selected);
				}}
			/>
		{/each}
	</g>
	<defs>
		<clipPath id="clip0_1_121">
			<rect width="468" height="280" fill="white" />
		</clipPath>
	</defs>
</svg>
