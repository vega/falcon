import { bin, binTime, numBins } from "../old/util";
import { Dimension } from "./dimension";
import type { Interval } from "../old/basic";
import { BinConfig } from "../old/api";

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
