<script lang="ts">
    export let title = "2D Heatmap";
    export let width: number;
    export let height: number;

    // 3 x 3 example heatmap
    export let bins2D = [
        [
            { binStart: 0, binEnd: 10, count: 100, filteredCount: 100 },
            { binStart: 10, binEnd: 20, count: 420, filteredCount: 400 },
            { binStart: 30, binEnd: 40, count: 666, filteredCount: 200 },
        ],
        [
            { binStart: 0, binEnd: 10, count: 100, filteredCount: 100 },
            { binStart: 10, binEnd: 20, count: 420, filteredCount: 400 },
            { binStart: 30, binEnd: 40, count: 666, filteredCount: 200 },
        ],
        [
            { binStart: 0, binEnd: 10, count: 100, filteredCount: 100 },
            { binStart: 10, binEnd: 20, count: 420, filteredCount: 400 },
            { binStart: 30, binEnd: 40, count: 666, filteredCount: 200 },
        ],
    ];
</script>

<div><!-- put stuff here --></div>

<style>
    /*  put stuff here */
</style>
