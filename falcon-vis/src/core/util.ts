import { scaleLinear } from "d3";
import { bin as vegaBin } from "vega-statistics";
import { scaleTime } from "d3";
import type { CategoricalRange, ContinuousDimension } from "./dimension";

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
export function numBinsCategorical(range: CategoricalRange) {
  return range.length;
}

/**
 * Takes the categorical names and maps them to indices
 * @returns function that returns bin index
 */
export function binNumberFunctionCategorical(range: CategoricalRange) {
  const binMapper = new Map(range.map((item, index) => [item, index]));
  return (item: any) => binMapper.get(item)!;
}

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
  const binningFunc = dimension.time ? binTime : binContinuous;
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
  resolution: number,
  nearestPixelInt = Math.floor
) {
  const pixelSpace = [1, resolution] as Interval<number>;
  const valueSpace = extent;
  const toPixels = scaleLinear().domain(valueSpace).range(pixelSpace);
  toPixels.clamp(true);

  return (x: number) => {
    const pixels = toPixels(x);
    return nearestPixelInt(pixels);
  };
}

export function excludeMap<K, V>(map: Map<K, V>, ...exclude: K[]) {
  return new Map<K, V>(
    Array.from(map.entries()).filter(([key, _]) => !exclude.includes(key))
  );
}

/**
 * Returns a function that returns the bin for a value.
 */
export function binNumberFunctionContinuous({ start, step, stop }: BinConfig) {
  /**
   * this used to be (v: number) => Math.floor((v - start) / step
   * using floor seems to map to a non-existent bin sometimes
   *
   * for example when the v=stop
   * suppose we have start = 0, step = 20, stop = 100
   * this should be 5 bins in total, each bin corresponding to 0, 1, 2, 3, or 4. (5 bins in total)
   * however when v=100 (aka the stop)
   * Math.floor(100-0 / 20) = 5. ???? 5 should not be an index that is a non-existent bin
   *
   * Math.ceil(100-0 / 20) - 1 = 4 is correct
   * frick but when its 0, the whole things goes to -1
   * so we need to clamp it to 0
   */
  const numBins = numBinsContinuous({ start, step, stop });
  const lastBinIndex = numBins - 1;
  return (v: number) => {
    const binIndexMapping = Math.floor((v - start) / step);
    if (binIndexMapping >= numBins) {
      return lastBinIndex;
    }
    return binIndexMapping;
  };
}

/**
 * Creates a string equivalent to binNumberFunctionContinuous operation in SQL
 */
export function binNumberFunctionContinuousSQL(
  field: string,
  { start, step, stop }: BinConfig,
  castString = (x: number) => `${x}`
) {
  const numBins = numBinsContinuous({ start, step, stop });
  const binIndexMapping = `FLOOR((${field} - ${castString(
    start
  )}) / ${castString(step)})::INT`;
  const lastBinIndex = castString(numBins - 1);
  const clamp = `LEAST(${lastBinIndex}, ${binIndexMapping})::INT`;
  return clamp;
}

/**
 * Returns a function that returns the bin for a pixel. Starts one pixel before so that the brush contains the data.
 */
export function binNumberFunctionPixels(
  { start, stop }: StartStopBinConfig,
  pixel: number
) {
  const step = stepSize({ start, stop }, pixel);
  return binNumberFunctionContinuous({ start, step, stop });
}

export function stepSize({ start, stop }: StartStopBinConfig, bins: number) {
  return (stop - start) / bins;
}

export function compactQuery(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}
