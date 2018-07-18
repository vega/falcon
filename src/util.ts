import cwise from "cwise";
import ndarray from "ndarray";
import { sub as subop } from "ndarray-ops";
import { bin as bin_ } from "vega-statistics";
import { BinConfig } from "./api";
import { Interval } from "./basic";
import { HIST_TYPE } from "./consts";

export const bin: (
  opt: { maxbins: number; extent: Interval<number> }
) => BinConfig = bin_;

/**
 * BinConfig that does not need to have a stop.
 */
interface StartStepBinConfig {
  start: number;
  stop?: number;
  step: number;
}

export function clamp(i: number, range: Interval<number>) {
  return Math.max(range[0], Math.min(range[1], i));
}

/**
 * Returns a function that discretizes a value.
 */
export function binFunction({ start, step }: StartStepBinConfig) {
  return (v: number) => start + step * Math.floor((v - start) / step);
}

/**
 * Convert from bin number to start of the bin in data space.
 */
export function binToData({ start, step }: StartStepBinConfig) {
  return (v: number) => start + v * step;
}

/**
 * Get the number of bins for a bin configuration.
 */
export function numBins({ start, step, stop }: BinConfig) {
  return (stop - start) / step;
}

export function stepSize(range: [number, number], bins: number) {
  return (range[1] - range[0]) / bins;
}

/**
 * Returns a function that returns the bin for a value.
 */
export function binNumberFunction({ start, step }: StartStepBinConfig) {
  return (v: number) => Math.floor((v - start) / step);
}

export function throttle<A extends (...args: any[]) => any>(
  func: A,
  timeout: number
): A {
  let inThrottle;

  return function(this: any, ...args: any[]) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        return (inThrottle = false);
      }, timeout);
    }
  } as any;
}

export function duplicate<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

export function flatten(data) {
  const keys = Object.keys(data);
  const out: any[] = [];
  for (let i = 0; i < data[keys[0]].length; i++) {
    const d = {};
    for (const k of keys) {
      d[k] = data[k][i];
    }
    out.push(d);
  }
  return out;
}

export function sub(a: ndarray, b: ndarray) {
  const out = ndarray(new HIST_TYPE(a.size), a.shape);
  subop(out, b, a);
  return out;
}

const satl = cwise({
  args: ["array", "array", "array", "array", "array"],
  body: function(_, a, b, c, d) {
    _ = a - b - c + d;
  },
  funcName: "satl"
});

/**
 * Assume that the four arrays are the corners ins a 2D summed area table.
 *
 * Origin in bottom left.
 *
 *   b----a
 *   |    |
 *   d----c
 *
 * 0
 *
 */
export function summedAreaTableLookup(
  a: ndarray,
  b: ndarray,
  c: ndarray,
  d: ndarray
) {
  const out = ndarray(new HIST_TYPE(a.size), a.shape);

  satl(out, a, b, c, d);

  return out;
}

/**
 * Return a map without a particular key.
 */
export function omit<K, V>(map: Map<K, V>, omit: K) {
  const copy = new Map(map);
  copy.delete(omit);
  return copy;
}

export function only<K, V>(map: Map<K, V>, only: K[]) {
  const copy = new Map();
  for (const k of only) {
    copy.set(k, map.get(k));
  }
  return copy;
}
