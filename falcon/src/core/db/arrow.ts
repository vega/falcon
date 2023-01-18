import { BitSet, union } from "../bitset";
import { BinnedCounts, FalconDB } from "./db";
import { FArray } from "../falconArray/falconArray";
import { binNumberFunction, numBins } from "../util";
import { View1D } from "../views";
import type { AsyncOrSync, FalconIndex, Filters } from "./db";
import type { Dimension } from "../dimension";
import type { Interval } from "../util";
import type { View } from "../views";
import type { Table, Vector } from "apache-arrow";

type DimensionFilterHash = string;
type FilterMasks<T> = Map<T, BitSet>;

export class ArrowDB implements FalconDB {
  readonly blocking: boolean;
  data: Table;
  filterMaskIndex: FilterMasks<DimensionFilterHash>;

  /**
   * Falcon Database using arrow data columnar table
   *
   * Starts by saving data by reference and
   * indicates that we have synchronous calls that are blocking
   *
   * @note [arrow specification](https://arrow.apache.org/docs/format/Columnar.html)
   * @note [arrow wes mckinney video](https://www.youtube.com/watch?v=fyj4FyH3XdU)
   */
  constructor(data: Table) {
    this.blocking = true;
    // bitmask to determine what rows filter out or not
    this.filterMaskIndex = new Map();
    this.data = data;
  }

  /**
   * Total number of rows in the arrow table
   *
   * @returns length: number of rows
   */
  length(): AsyncOrSync<number> {
    return this.data.numRows;
  }

  /**
   *  extent given a dimension with continuous range of numbers
   *
   * @returns the min and max of a range of values for the dimension
   */
  extent(dimension: Dimension): AsyncOrSync<Interval<number>> {
    const arrowColumn = this.data.getChild(dimension.name);
    const arrowColumnExists = arrowColumn !== null;
    if (arrowColumnExists) {
      return arrowColumnExtent(arrowColumn);
    } else {
      throw Error(
        `Dimension name ${dimension.name} wasn't found on the arrow table`
      );
    }
  }

  /**
   * Takes in the view and returns
   * the total counts for each bin in the ENTIRE arrow table
   *
   * @todo have parameter where you can pass the typed arrays as input
   * so we can allocate elsewhere and keep the memory instead of reallocating
   * @returns an array of counts for each bin
   */
  loadAll1D(view: View1D, filters?: Filters): BinnedCounts {
    // 1. decide which rows are filtered or not
    const filterMask: BitSet | null = union(
      ...this.getFilterMasks(filters ?? new Map()).values()
    );

    // 2. resolve binning scheme
    const binConfig = view.dimension.binConfig!;
    const bin = binNumberFunction(binConfig);
    const binCount = numBins(binConfig);

    // 3. allocate memory (perhaps this should not be done every time)
    // and instead pass by reference and control this in the background
    const noFilter = new FArray(new Int32Array(binCount));
    const filter = filterMask ? new FArray(new Int32Array(binCount)) : noFilter;

    // 4. iterate over the row values and determine which bin to increment
    const column = this.data.getChild(view.dimension.name)!;
    for (let i = 0; i < this.data.numRows; i++) {
      const value: number = column.get(i)!;
      const binLocation = bin(value);
      if (0 <= binLocation && binLocation < binCount) {
        noFilter.increment(binLocation);
        if (filterMask && !filterMask.get(i)) {
          filter.increment(binLocation);
        }
      }
    }

    // 5. return the results
    return {
      noFilter: noFilter.ndarray,
      filter: filter.ndarray,
    };
  }

  //@ts-ignore
  loadIndex1D(
    activeView: View1D,
    passiveViews: View[],
    filters?: Filters
  ): FalconIndex {
    activeView;
    passiveViews;
    filters;
    return {} as FalconIndex;
  }

  /**
   * given the dimension and filters
   *
   * @returns a map of the filter masks
   */
  private getFilterMasks(filters: Filters): FilterMasks<Dimension> {
    // no filters just return blank
    if (!filters.size) {
      return new Map();
    }

    // extract filters from the larger cache index into this compact one
    const compactIndex: FilterMasks<Dimension> = new Map();
    for (const [dimension, extent] of filters) {
      const mask = this.getFilterMask(dimension, extent)!;
      compactIndex.set(dimension, mask);
    }

    return compactIndex;
  }

  /**
   * Gets filter mask given the filter (extent for now)
   *
   * @returns a bitmask of which 1 if the row value should be included or 0 if not
   */
  private getFilterMask(dimension: Dimension, extent: Interval<number>) {
    const key = `${dimension.name} ${extent}`;

    // if not in the cache, compute it and add it!
    const notFound = !this.filterMaskIndex.has(key);
    if (notFound) {
      // compute filter mask
      const column = this.data.getChild(dimension.name)!;
      const mask = arrowFilterMask(
        column,
        (value: number) => value < extent[0] || value >= extent[1]
      );

      // set the cache
      this.filterMaskIndex.set(key, mask);
    }

    // return the value of the mask
    return this.filterMaskIndex.get(key);
  }
}
/**
 * given an arrow column vector, create a filter mask
 *
 * @note uses bitmask to reduce space and allow for potential computer optimizations
 * @note should keep => true corresponds to 1 and otherwise 0
 * @returns a bitmask that indicates if the values should be included (1) or not (0)
 */
function arrowFilterMask<T>(
  column: Vector,
  shouldKeep: (rowValue: T) => boolean
) {
  const bitmask = new BitSet(column.length);

  /**
   * iterate each row value in the column and decide if we should
   * keep it or not
   *
   * bit 1 indicates keep
   * bit 0 indicates remove
   */
  for (let i = 0; i < column.length; i++) {
    const rowValue: T = column.get(i)!;
    if (shouldKeep(rowValue)) {
      bitmask.set(i, true);
    }
  }

  return bitmask;
}

/**
 * extent over a single columnar vector from arrow
 *
 * @returns the [min, max] of the column values
 */
function arrowColumnExtent(column: Vector): Interval<number> {
  const firstRowValue: number = column.get(0)!;
  let max = firstRowValue;
  let min = firstRowValue;

  for (const rowValue of column) {
    // if we found something BIGGER the max, that should be the max instead!
    if (rowValue > max) {
      max = rowValue;
    }
    // if we found something SMALLER the min, that should be the min instead!
    else if (rowValue < min) {
      min = rowValue;
    }
  }

  return [min, max];
}
