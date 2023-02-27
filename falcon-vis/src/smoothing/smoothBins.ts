import type { TypedArray } from "../core/falconArray/arrayTypes";
import * as kde from "fast-kde";

export type BinDefinition = { binStart: number; binEnd: number };
export type BinCounts = TypedArray | number[];
export interface SmoothBinsOutput {
  bins: BinDefinition[];
  counts: BinCounts;
}
export interface SmoothBinsInput extends SmoothBinsOutput {
  // number of bins after smoothing
  numOutputBins: number;
}
namespace FastKde {
  export type Density1DOutput = Iterable<{ x: number; y: number }>;
  export type Density1DValues = number[] | TypedArray;
  export interface Density1DOptions {
    bandwidth: number;
    pad: number;
    bins: number;
  }
}

/**
 * smooths over discrete bins to form a continuous like distribution
 * key assumption: as bins -> the function approaches the continuous distribution
 * so here we try to approximate this behavior without actually going to large n
 *
 * @returns ?
 */
export function smoothBins1D({
  bins,
  counts,
  numOutputBins,
}: SmoothBinsInput): SmoothBinsOutput {
  console.log(bins, counts, numOutputBins);
  const density1D = fastKde1D([1, 2, 3], {
    bandwidth: 3,
    pad: 4,
    bins: 100,
  });
  for (const point of density1D) {
    console.log(point);
  }
  throw new Error("not implemented");
}

function fastKde1D(
  values: FastKde.Density1DValues,
  options: FastKde.Density1DOptions
): FastKde.Density1DOutput {
  return kde.density1d(values, options);
}
