<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { VegaLiteSpec } from "svelte-vega";
    import { VegaLite } from "svelte-vega";
    import type { View } from "svelte-vega";

    const dispatch = createEventDispatcher<{
        brush: [number, number] | null;
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

    $: data = {
        table: bins,
    };

    $: spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "A simple bar chart with embedded data.",
        data: {
            name: "table",
        },
        width: width,
        height: height,
        title: title,
        layer: [
            {
                params: [
                    {
                        name: "brush",
                        select: { type: "interval", encodings: ["x"] },
                    },
                ],
                mark: { type: "bar", cursor: "col-resize" },
                encoding: {
                    x: {
                        field: "bin[0]",
                        bin: { binned: true },
                    },
                    x2: { field: "bin[1]" },
                    y: {
                        field: "count",
                        type: "quantitative",
                    },
                    color: { value: "#ddd" },
                },
            },
            {
                mark: { type: "bar" },
                encoding: {
                    size: {
                        legend: null,
                    },
                    x: {
                        field: "bin[0]",
                        bin: { binned: true },
                        title: "",
                        axis: {
                            title: dimLabel,
                            labelColor: "rgba(0, 0, 0, 0.6)",
                        },
                    },
                    x2: { field: "bin[1]" },
                    y: {
                        field: "filteredCount",
                        type: "quantitative",
                        title: "count",
                        axis: {
                            title: countLabel,
                            tickCount: 2,
                            labelColor: "rgba(0, 0, 0, 0.6)",
                        },
                    },
                    color: { value: "salmon" },
                },
            },
        ],
    } as VegaLiteSpec;

    let view: View;
    $: if (view) {
        view.addSignalListener("brush", (...s) => {
            dispatch("brush", s[1][`bin\\.0`] ?? null);
        });
    }
</script>

<div on:mouseenter on:mouseleave class="container">
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
