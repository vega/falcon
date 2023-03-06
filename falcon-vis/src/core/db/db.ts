import type { Row } from "../iterator";
import type {
  CategoricalRange,
  ContinuousRange,
  Dimension,
  DimensionFilter,
} from "../dimension";
import type { FalconArray } from "../falconArray";
import type { View, View1D } from "../views";

export interface FalconCounts {
  filter: FalconArray;
  noFilter: FalconArray;
}
export interface FalconCube {
  filter: FalconArray;
  noFilter: FalconArray;
}
export type SyncIndex = Map<View, FalconCube>;
export type AsyncIndex = Map<View, Promise<FalconCube>>;
export type FalconIndex = SyncIndex | AsyncIndex;
export type AsyncOrSync<T> = Promise<T> | T;
export type Filter = DimensionFilter;
export type Filters = Map<Dimension, Filter>;

/**
 * API that the core/falcon uses for database
 */
export interface FalconDB {
  /**
   * loads the ENTIRE (not filtered) length of the data
   * aka number of rows
   *
   * @returns the length as a number
   */
  length(filters?: Filters): AsyncOrSync<number>;

  /**
   * determines the min and max of a continuous dimensions
   * determines the unique range of values for categorical dimensions
   *
   * @returns [min, max] or unique[]
   */
  range(dimension: Dimension): AsyncOrSync<ContinuousRange | CategoricalRange>;

  /**
   * Checks whether the table exists or not
   */
  tableExists(): AsyncOrSync<boolean>;

  /**
   * checks whether the dimension exists or not
   */
  dimensionExists(dimension: Dimension): AsyncOrSync<boolean>;

  /**
   * Gets the entries of the data given an offset and length
   *
   * @param length is the max number of rows to return
   * @param offset is the number of initial rows to skip
   *
   * @returns an iterable over the rows
   */
  entries(
    offset?: number,
    length?: number,
    filters?: Filters
  ): AsyncOrSync<Iterable<Row | null>>;

  /**
   * loads the ENTIRE (not filtered) counts of the 1-Dimensional binning
   * like a histogram
   *
   * @returns object with counts over bins
   */
  histogramView1D(view: View1D, filters?: Filters): AsyncOrSync<FalconCounts>;

  /**
   * loads falcon index that accumulates pixel counts over passive bins
   * more details in the [paper](https://idl.cs.washington.edu/files/2019-Falcon-CHI.pdf)
   *
   * @returns index of passive views to falcon cubes
   */
  falconIndexView1D(
    activeView: View1D,
    passiveViews: View[],
    filters: Filters
  ): FalconIndex;
}
