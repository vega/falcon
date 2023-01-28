import { bin as vegaBin } from "vega-statistics";
import { scaleTime } from "d3";
import type { ContinuousDimension } from "./dimension";

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
 * BinConfig that does not need to have a stop.
 */
interface StartStepBinConfig {
  start: number;
  stop?: number;
  step: number;
}

/**
 * BinConfig that does not need to have a step.
 */
interface StartStopBinConfig {
  start: number;
  stop: number;
  step?: number;
}

/**
 * UTILITY FUNCTIONS
 * -----------------
 */

/**
 * Get the number of bins for a bin configuration.
 */
export function numBinsContinuous({ start, step, stop }: BinConfig) {
  return (stop - start) / step;
}

export function binContinuous(
  maxbins: number,
  extent: Interval<number>
): BinConfig {
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

export function createBinConfigContinuous(
  dimension: ContinuousDimension,
  extent: Interval<number>
) {
  const time = false;
  const binningFunc = time ? binTime : binContinuous;
  return binningFunc(dimension.bins, extent);
}

export function readableBinsContinuous(binConfig: BinConfig) {
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

export function conciseBinsContinuous(binConfig: BinConfig) {
  const n = numBinsContinuous(binConfig);
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

/**
 * Returns a function that returns the bin for a value.
 */
export function binNumberFunctionContinuous({
  start,
  step,
}: StartStepBinConfig) {
  return (v: number) => Math.floor((v - start) / step);
}

/**
 * Returns a function that returns the bin for a pixel. Starts one pixel before so that the brush contains the data.
 */
export function binNumberFunctionBinsContinuous(
  { start, stop }: StartStopBinConfig,
  pixel: number
) {
  const step = stepSize({ start, stop }, pixel);
  return binNumberFunctionContinuous({ start: start, step });
}

export function stepSize({ start, stop }: StartStopBinConfig, bins: number) {
  return (stop - start) / bins;
}

export function compactQuery(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}
