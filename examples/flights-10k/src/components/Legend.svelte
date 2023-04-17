<script lang="ts">
	import * as d3 from "d3";

	export let data: ArrayLike<number>;
	export let numberToColor: (t: number) => string;
	export let width: number;
	export let height: number;
	export let title = "Density Legend";

	let min: number, max: number;
	let legendG: SVGGElement;

	$: [min, max] = d3.extent(data);
	$: scale = d3.scaleLinear().domain([0, max]).range([0, width]).nice();
	$: axis = d3.axisBottom(scale).ticks(3);
	$: {
		if (legendG) {
			d3.select(legendG).transition().call(axis);
		}
	}

	const CONTINUOUS_COLOR_SCALE = interpolateToStringArray(
		numberToColor,
		20,
		0.1
	);

	/**
	 * Takes a function that produces colors from numbers into a fixed sized array
	 *
	 * from [Zeno](https://github.com/zeno-ml/zeno/blob/main/frontend/src/instance-views/scatter-view/regl-scatter/colors.ts)
	 *
	 * @returns string array of hex colors
	 */
	function interpolateToStringArray(
		colorInterpolate: (x: number) => string,
		length: number,
		padLeft = 0,
		padRight = 0
	) {
		const colors: string[] = new Array(length);
		const interval = 1 / (length - padLeft - padRight);
		let inputValue = 0 + padLeft;
		for (let i = 0; i < length; i++) {
			// must be a normalized value
			if (inputValue > 1) {
				inputValue = 1;
			} else if (inputValue < 0) {
				inputValue = 0;
			}

			// from continuous function to string hex
			const rgbString = colorInterpolate(inputValue);
			colors[i] = d3.color(rgbString).hex();
			inputValue += interval;
		}

		return colors;
	}
</script>

<label for="#legend" class="label">{title}</label>
<div id="legend">
	<div>
		<svg {height} {width} style="border: 0.5px solid grey;">
			{#each CONTINUOUS_COLOR_SCALE as color, i}
				{@const spacing = width / CONTINUOUS_COLOR_SCALE.length}
				{@const colorWidth =
					(1 / CONTINUOUS_COLOR_SCALE.length) * width}
				<rect
					x={i * spacing}
					y={0}
					{height}
					width={colorWidth}
					fill={color}
				/>
			{/each}
		</svg>
	</div>
	<div>
		<svg height={20} {width} style="overflow: visible;">
			<g
				bind:this={legendG}
				transform="translate({0}, {0})"
				fill="lightgrey"
				clip-path="url(#clip)"
				class="axis"
			/>
			<defs>
				<clipPath id="clip">
					<rect x={-5} width={width + 25} height={20} fill="white" />
				</clipPath>
			</defs>
		</svg>
	</div>
</div>

<style>
	.axis {
		color: grey;
	}
	.label {
		color: grey;
		font-size: smaller;
	}
</style>
