<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher();
</script>

<div
    id="hover-container"
    on:mouseenter={() => dispatch("hover", true)}
    on:mouseleave={() => dispatch("hover", false)}
>
    <slot />
</div>

<style>
    #hover-container {
        display: inline-block;
        outline: 1px solid black;
    }
</style>
