import { NdArray } from "ndarray";

import type { View, View1D } from "../views";
import type { Dimension } from "../dimension";
import type { Interval } from "../util";

export type FalconArray = NdArray;
export interface BinnedCounts {
  filter: NdArray;
  noFilter: NdArray;
}
export interface FalconCube {
  filter: NdArray;
  noFilter: NdArray;
}
export type SyncIndex = Map<View, FalconCube>;
export type AsyncIndex = Map<View, Promise<FalconCube>>;
export type FalconIndex = SyncIndex | AsyncIndex;
export type AsyncOrSync<T> = Promise<T> | T;
export type DimensionFilters = Map<string, Interval<number>>;

export type Filter = Interval<number>;
export type Filters = Map<Dimension, Filter>;

/**
 * API that the core/falcon uses for database
 */
export interface FalconDB {
  /**
   * loads the ENTIRE (not filtered) length of the data
   * aka number of rows
   */
  length(): AsyncOrSync<number>;

  /**
   * loads the ENTIRE (not filtered) counts of the 1-Dimensional binning
   * like a histogram
   */
  histogramView1D(view: View1D, filters?: Filters): AsyncOrSync<BinnedCounts>;

  /**
   * loads falcon index that accumulates pixel counts over passive bins
   * There mig
   */
  falconIndexView1D(
    activeView: View1D,
    passiveViews: View[],
    filters: Filters
  ): FalconIndex;

  /**
   * determines the min and max of a continuous numbers
   * over the dimension
   */
  extent(dimension: Dimension): AsyncOrSync<Interval<number>>;
}
