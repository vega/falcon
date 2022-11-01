<script lang="ts">
    import BarChart from "./lib/BarChart.svelte";
    import * as falcon from "../../src/index";

    /**
     * Falcon 2 library example
     */
    const data = new falcon.ArrowDB("flights-10k.arrow");
    const falconData = new falcon.FalconGlobal(data);

    /**
     * Construct dimensions 0D, 1D, and 2D and add to the falconData
     */
    const totalCount = new falcon.FalconView({ type: "0D" }, (count) => {
        console.log(count);
    });
    const distance = new falcon.FalconView(
        {
            type: "1D",
            dimension: {
                name: "DISTANCE",
                bins: 25,
                extent: [0, 4000],
                resolution: 100,
            },
        },
        (counts) => {
            console.log(counts);
        }
    );
    const departureDelay = new falcon.FalconView(
        {
            type: "1D",
            dimension: {
                name: "DEP_DELAY",
                bins: 25,
                extent: [-20, 60],
                resolution: 100,
            },
        },
        (counts) => {
            console.log(counts);
        }
    );
    const departureVsArrivalDelaysView = new falcon.FalconView(
        {
            type: "2D",
            dimensions: [
                {
                    name: "DEP_DELAY",
                    bins: 25,
                    extent: [-20, 60],
                    resolution: 100,
                },
                {
                    name: "ARR_DELAY",
                    bins: 25,
                    extent: [-20, 60],
                    resolution: 100,
                },
            ],
        },
        (counts) => {
            console.log(counts);
        }
    );
    falconData.add(distance, totalCount, departureDelay);
    console.log(distance);
</script>

<main>
    <h1>Falcon Premade components</h1>
    <p>Interactive visualization of flights with</p>

    <div id="views">
        <BarChart width={500} height={175} />
    </div>
    <div>
        <button
            on:click={async () => {
                distance.prefetch();
            }}>PREFETCH distance</button
        >
        <button
            on:click={async () => {
                departureDelay.prefetch();
            }}>PREFETCH departure delay</button
        >
        <!-- <button
            on:click={async () => {
                departureVsArrivalDelaysView.prefetch();
            }}>PREFETCH 2D</button
        > -->
    </div>
    <div>
        <button
            on:click={async () => {
                // 3627 count unfiltered
                distance.interact([0, 1000]);
            }}>INTERACT distance</button
        >
        <button
            on:click={async () => {
                departureDelay.interact([0, 10]);
            }}>INTERACT departure delay</button
        >
        <!-- <button
            on:click={async () => {
                // 5696 count unfiltered
                departureVsArrivalDelaysView.interact([
                    [-13, 10],
                    [6, -20],
                ]);
            }}>INTERACT 2D</button
        > -->
    </div>
    <div>
        <button
            on:click={() => {
                console.log(falconData.dataCube);
            }}>Log data cube</button
        >
    </div>
</main>

<style>
</style>
