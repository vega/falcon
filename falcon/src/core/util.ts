import ndarray from "ndarray";
import ops from "ndarray-ops";
import { bin as vegaBin } from "vega-statistics";
import { scaleTime } from "d3";
import type { NdArray } from "ndarray";
import type { Dimension } from "./dimension";
import { HIST_TYPE } from "./consts";

/**
 * UTILITY TYPES
 * -------------
 */

export type Interval<T> = [T, T];

/**
 * Binning configuration.
 */
export interface BinConfig {
  start: number;
  stop: number;
  step: number;
}

/**
 * UTILITY FUNCTIONS
 * -----------------
 */

/**
 * Get the number of bins for a bin configuration.
 */
export function numBins({ start, step, stop }: BinConfig) {
  return (stop - start) / step;
}

export function bin(maxbins: number, extent: Interval<number>): BinConfig {
  return vegaBin({ maxbins, extent });
}

export function binTime(maxbins: number, extent: Interval<number>): BinConfig {
  const ts = scaleTime().domain(extent);
  const ticks = ts.ticks(maxbins);
  const start = ticks[0].getTime();
  const stop = ticks[ticks.length - 1].getTime();
  const step = (stop - start) / ticks.length;

  // not that this is not accurate but the best we can do if we require regular intervals
  return {
    start,
    stop,
    step: step,
  };
}

export function createBinConfig(
  dimension: Dimension,
  extent: Interval<number>
) {
  const time = false;
  const binningFunc = time ? binTime : bin;
  return binningFunc(dimension.bins, extent);
}

export function readableBins(binConfig: BinConfig) {
  let bins: { binStart: number; binEnd: number }[] = [];
  let curStart = binConfig.start;
  let curEnd = curStart + binConfig.step;
  while (curEnd <= binConfig.stop) {
    bins.push({ binStart: curStart, binEnd: curEnd });
    curStart = curEnd;
    curEnd += binConfig.step;
  }
  return bins;
}

export function conciseBins(binConfig: BinConfig) {
  const n = numBins(binConfig);
  const bins = new Float32Array(n);
  let curStart = binConfig.start;
  for (let i = 0; i < n; i++) {
    bins[i] = curStart;
    curStart += binConfig.step;
  }
  return bins;
}

/**
 * returns a function to scales to pixel resolution to
 * the floor integer pixel
 */
export function brushToPixelSpace(
  extent: Interval<number>,
  resolution: number
) {
  const toPixelsAndFloor = scaleFilterToResolution(extent, resolution);
  return (brush: Interval<number>) => {
    return [
      toPixelsAndFloor(brush[0]),
      toPixelsAndFloor(brush[1]),
    ] as Interval<number>;
  };
}

/**
 * returns a function to scales to pixel resolution to
 * the floor integer pixel
 */
export function scaleFilterToResolution(
  extent: Interval<number>,
  resolution: number
) {
  const pixelSpace = [0, resolution] as Interval<number>;
  const valueSpace = extent;
  const toPixels = scaleLinear({
    domain: valueSpace,
    range: pixelSpace,
  });

  return (x: number) => {
    const pixels = toPixels(x);
    return Math.floor(pixels);
  };
}

export function scaleLinear({
  domain,
  range,
}: {
  domain: Interval<number>;
  range: Interval<number>;
}) {
  const p1 = { x: domain[0], y: range[0] };
  const p2 = { x: domain[1], y: range[1] };

  const dy = p2.y - p1.y;
  const dx = p2.x - p1.x;

  if (dx <= 0) {
    throw Error("divide by 0 error, pick a non-zero domain");
  }

  // y = mx + b
  const m = dy / dx;
  const b = p2.y - m * p2.x;

  return (x: number) => m * x + b;
}

export function excludeMap<K, V>(map: Map<K, V>, ...exclude: K[]) {
  return new Map<K, V>(
    Array.from(map.entries()).filter(([key, _]) => !exclude.includes(key))
  );
}

export function sub(a: NdArray, b: NdArray) {
  const out = ndarray(new HIST_TYPE(a.size), a.shape);
  ops.sub(out, b, a);
  return out;
}
