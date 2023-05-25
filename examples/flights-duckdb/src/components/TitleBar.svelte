<script lang="ts">
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();

	export let title: string = "";
	export let selection: null | any[] = null;
</script>

<div class="top">
	<div class="title">{title}</div>
	{#if selection}
		<div>
			<span class="selection"
				>[{selection}]<span />
				<button
					class="reset"
					on:click={async () => {
						dispatch("reset");
					}}
					>Reset
				</button>
			</span>
		</div>
	{/if}
</div>

<style>
	.top {
		display: flex;
		justify-content: space-between;
	}
	.reset {
		padding: 0.2em 1em;
		font-size: 1em;
		font-weight: 400;
		font-family: inherit;
		cursor: pointer;
		transition: border-color 0.25s;
	}
	.selection {
		color: lightgrey;
		font-size: smaller;
	}
	.title {
		font-family: "Exo", sans-serif;
		font-size: 18px;
		color: var(--primary-color);
	}
</style>
