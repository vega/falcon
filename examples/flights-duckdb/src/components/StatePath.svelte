<script lang="ts">
	import { createEventDispatcher } from "svelte";

	export let d: string;
	export let fill: string;
	export let title = "";
	export let stroke: string = "hsla(0, 0%, 0%, 0.075)";
	export let strokeWidth = 0.75;
	export let hoveringStroke = "black";
	export let hoveringStrokeWidth = 1;
	const dispatch = createEventDispatcher();
	let isHovering = false;
</script>

<path
	{d}
	stroke={isHovering ? hoveringStroke : stroke}
	{fill}
	stroke-width={isHovering ? hoveringStrokeWidth : strokeWidth}
	on:click
	on:mouseenter={() => {
		isHovering = true;
		dispatch("mouseenter");
	}}
	on:mouseleave={() => {
		isHovering = false;
		dispatch("mouseleave");
	}}
>
	{#if title}
		<title>{title}</title>
	{/if}
</path>
