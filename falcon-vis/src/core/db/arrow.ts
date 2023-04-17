import { tableFromIPC, Table } from "apache-arrow";
import { BitSet, union } from "../bitset";
import { greatScott } from "../bins";
import { FalconDB, SyncIndex } from "./db";
import { FalconArray } from "../falconArray";
import { Row, RowIterator } from "../iterator";
import {
  binNumberFunctionContinuous,
  binNumberFunctionPixels,
  numBinsContinuous,
  numBinsCategorical,
  binNumberFunctionCategorical,
} from "../util";
import { View0D, View1D } from "../views";
import type { Vector } from "apache-arrow";
import type { Filters, FalconCounts, FalconIndex, FalconCube } from "./db";
import type {
  CategoricalDimension,
  CategoricalRange,
  ContinuousDimension,
  ContinuousRange,
  Dimension,
} from "../dimension";
import type { Interval, BinNumberFunction } from "../util";
import type { View } from "../views";

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
  constructor(data: Table, filterMaskCacheSize = 64) {
    this.blocking = true;
    // bitmask to determine what rows filter out or not
    this.filterMaskIndex = new LRUMap(filterMaskCacheSize); // only save a few recent filter masks in memory
    this.data = data;
  }

  /**
   * Easy helper method to create a new ArrowDB from an arrow file
   *
   * @todo think about if we should even support this
   * @returns a new ArrowDB object with the arrow data from the file
   */
  static async fromArrowFile(url: string): Promise<ArrowDB> {
    const data = await fetch(url);
    const buffer = await data.arrayBuffer();
    const table = tableFromIPC(buffer);
    return new ArrowDB(table);
  }

  /**
   * compute the best number of bins for a histogram
   * given the data
   *
   * @resource [plot](https://github.com/observablehq/plot/blob/97924e7682e49d35a34da794ca98bf0c7e8a3c28/src/transforms/bin.js#L320)
   * @resource [lord and savior](https://twitter.com/mbostock/status/1429281697854464002)
   * @resource [numpy](https://numpy.org/doc/stable/reference/generated/numpy.histogram_bin_edges.html)
   */
  estimateNumBins(
    dimension: ContinuousDimension,
    maxThreshold = 200,
    noKnowledgeEstimate = 15
  ): number {
    const arrowColumn = this.data.getChild(dimension.name)!;
    if (arrowColumn.length <= 1) {
      // can't do much with one data point
      return 1;
    }

    if (dimension.range) {
      const standardDeviation = Math.sqrt(sampleVariance(arrowColumn)); // \sqrt{\sigma^2}
      const [min, max] = dimension.range;
      const optimalBins = greatScott(min, max, standardDeviation);
      return Math.min(optimalBins, maxThreshold);
    }
    // if we don't have a min max range, just return the no knowledge estimate
    return noKnowledgeEstimate;
  }

  length(filters?: Filters): number {
    if (filters) {
      const filterMask: BitSet | null = union(
        ...this.getFilterMasks(filters).values()
      );

      let total = 0;
      for (const bit of filterMask!) {
        // if the bit is not set (aka false) then add 1 to the total
        if (bit === false) {
          total++;
        }
      }

      return total;
    } else {
      return this.data.numRows;
    }
  }

  private categoricalRange(arrowColumn: Vector): CategoricalRange {
    return arrowColumnUnique(arrowColumn).filter((item) => item !== null);
  }
  private continuousRange(arrowColumn: Vector): ContinuousRange {
    return arrowColumnExtent(arrowColumn);
  }
  range(dimension: Dimension): ContinuousRange | CategoricalRange {
    const arrowColumn = this.data.getChild(dimension.name);
    const arrowColumnExists = arrowColumn !== null;
    if (arrowColumnExists) {
      if (dimension.type === "continuous") {
        return this.continuousRange(arrowColumn);
      } else if (dimension.type === "categorical") {
        return this.categoricalRange(arrowColumn);
      } else {
        throw Error("Unsupported Dimension type for range");
      }
    } else {
      throw Error("Dimension name does not exist in arrow table");
    }
  }

  dimensionExists(dimension: Dimension): boolean {
    return this.data.getChild(dimension.name) !== null;
  }

  tableExists(): boolean {
    return this.data && this.data.numCols > 0;
  }

  async entries(
    offset: number = 0,
    length: number = Infinity,
    filters?: Filters | undefined
  ): Promise<Iterable<Row | null>> {
    const filterMask: BitSet | null = union(
      ...this.getFilterMasks(filters ?? new Map()).values()
    );
    return new RowIterator(
      this.data.numRows,
      (i) => this.data.get(i),
      filterMask,
      offset,
      length
    );
  }

  histogramView1D(view: View1D, filters?: Filters): FalconCounts {
    let filter: FalconArray;
    let noFilter: FalconArray;
    let bin: BinNumberFunction;
    let binCount: number;

    // 1. decide which rows are filtered or not
    const filterMask: BitSet | null = union(
      ...this.getFilterMasks(filters ?? new Map()).values()
    );

    // 2. allocate memory for the bins
    if (view.dimension.type === "continuous") {
      const binConfig = view.dimension.binConfig!;
      binCount = numBinsContinuous(binConfig);
      bin = binNumberFunctionContinuous(binConfig);
    } else if (view.dimension.type === "categorical") {
      binCount = numBinsCategorical(view.dimension.range!);
      bin = binNumberFunctionCategorical(view.dimension.range!);
    } else {
      throw new Error("Unsupported dimension type for array allocation");
    }
    noFilter = FalconArray.allocCounts(binCount);
    filter = filterMask ? FalconArray.allocCounts(binCount) : noFilter;

    // 3. iterate over the row values and determine which bin to increment
    const column = this.data.getChild(view.dimension.name)!;
    for (let i = 0; i < this.data.numRows; i++) {
      const value: any = column.get(i)!;
      const binLocation = bin(value)!;

      // increment the specific bin
      if (0 <= binLocation && binLocation < binCount && isNotNull(value)) {
        noFilter.increment([binLocation]);
        if (filterMask && !filterMask.get(i)) {
          filter.increment([binLocation]);
        }
      }
    }

    // 5. return the results
    return {
      noFilter,
      filter,
    };
  }

  falconIndexView1D(
    activeView: View1D,
    passiveViews: View[],
    filters: Filters
  ): FalconIndex {
    const filterMasks = this.getFilterMasks(filters);
    const cubes: SyncIndex = new Map();

    if (activeView.dimension.type === "continuous") {
      // 1. bin mapping functions
      const pixels = activeView.dimension.resolution;
      const activeDim = activeView.dimension;
      const binActive = binNumberFunctionPixels(activeDim.binConfig!, pixels);
      const activeCol = this.data.getChild(activeDim.name)!;
      const numPixels = pixels + 1; // extending by one pixel so we can compute the right diff later

      // 2. iterate over each passive view to compute cubes
      passiveViews.forEach((view) => {
        const cube = this.cubeSlice1DContinuous(
          view,
          activeCol,
          filterMasks,
          numPixels,
          binActive
        );
        cubes.set(view, cube);
      });
    } else if (activeView.dimension.type === "categorical") {
      // 1. bin mapping functions
      const binActive = binNumberFunctionCategorical(
        activeView.dimension.range!
      );
      const binCountActive = numBinsCategorical(activeView.dimension.range!);
      const activeCol = this.data.getChild(activeView.dimension.name)!;

      // 2. iterate over each passive view to compute cubes
      passiveViews.forEach((view) => {
        const cube = this.cubeSlice1DCategorical(
          view,
          activeCol,
          filterMasks,
          binActive,
          binCountActive
        );
        cubes.set(view, cube);
      });
    } else {
      throw new Error("Unsupported dimension type for index1D");
    }

    return cubes;
  }

  /**
   * Takes a view and computes the falcon cube for that passive view
   * more details in the [paper](https://idl.cs.washington.edu/files/2019-Falcon-CHI.pdf)
   *
   * @note Only works for 0D and 1D continuous views at the moment
   * @returns a cube as FalconArray for the passive view
   */
  cubeSlice1DCategorical(
    view: View,
    activeCol: Vector,
    filterMasks: FilterMasks<Dimension>,
    binActive: BinNumberFunction,
    binCountActive: number
  ): FalconCube {
    let noFilter: FalconArray;
    let filter: FalconArray;

    // 2.1 only filter all other dimensions (filter on same dimension does not apply)
    const relevantMasks = new Map(filterMasks);
    if (view instanceof View0D) {
      // use all filters
    } else if (view instanceof View1D) {
      // remove itself from filtering
      relevantMasks.delete(view.dimension);
    }
    const filterMask = union(...relevantMasks.values());

    if (view instanceof View0D) {
      filter = FalconArray.allocCounts(binCountActive);
      noFilter = FalconArray.allocCounts(1, [1]);

      // add data to aggregation matrix
      for (let i = 0; i < this.data.numRows; i++) {
        // ignore filtered entries
        if (filterMask && filterMask.get(i)) {
          continue;
        }

        const keyActive = binActive(activeCol.get(i)!)!;
        if (0 <= keyActive && keyActive < binCountActive) {
          filter.increment([keyActive]);
        }
        noFilter.increment([0]);
      }
    } else if (view instanceof View1D) {
      let binPassive: BinNumberFunction;
      let binCount: number;

      if (view.dimension.type === "continuous") {
        // continuous bins for passive view that we accumulate across
        const binConfig = view.dimension.binConfig!;
        binPassive = binNumberFunctionContinuous(binConfig);
        binCount = numBinsContinuous(binConfig);
      } else {
        // categorical bins for passive view that we accumulate across
        binPassive = binNumberFunctionCategorical(view.dimension.range!);
        binCount = numBinsCategorical(view.dimension.range!);
      }

      filter = FalconArray.allocCounts(binCountActive * binCount, [
        binCountActive,
        binCount,
      ]);
      noFilter = FalconArray.allocCounts(binCount, [binCount]);

      const passiveCol = this.data.getChild(view.dimension.name)!;

      // add data to aggregation matrix
      for (let i = 0; i < this.data.numRows; i++) {
        // ignore filtered entries
        if (filterMask && filterMask.get(i)) {
          continue;
        }

        const valueActive = activeCol.get(i)!;
        const valuePassive = passiveCol.get(i)!;
        const keyPassive = binPassive(valuePassive)!;
        const keyActive = binActive(valueActive)!;
        if (
          0 <= keyPassive &&
          keyPassive < binCount &&
          isNotNull(valuePassive)
        ) {
          if (
            0 <= keyActive &&
            keyActive < binCountActive &&
            isNotNull(valueActive)
          ) {
            filter.increment([keyActive, keyPassive]);
          }
          noFilter.increment([keyPassive]);
        }
      }
    } else {
      throw Error("Unsupported passive view type in cube computation");
    }

    return { noFilter, filter };
  }
  /**
   * Takes a view and computes the falcon cube for that passive view
   * more details in the [paper](https://idl.cs.washington.edu/files/2019-Falcon-CHI.pdf)
   *
   * @note Only works for 0D and 1D continuous views at the moment
   * @returns a cube as FalconArray for the passive view
   */
  cubeSlice1DContinuous(
    view: View,
    activeCol: Vector,
    filterMasks: FilterMasks<Dimension>,
    numPixels: number,
    binActive: BinNumberFunction
  ): FalconCube {
    let noFilter: FalconArray;
    let filter: FalconArray;

    // 2.1 only filter all other dimensions (filter on same dimension does not apply)
    const relevantMasks = new Map(filterMasks);
    if (view instanceof View0D) {
      // use all filters
    } else if (view instanceof View1D) {
      // remove itself from filtering
      relevantMasks.delete(view.dimension);
    }
    const filterMask = union(...relevantMasks.values());

    // 2.2 this count counts for each pixel wise bin
    if (view instanceof View0D) {
      filter = FalconArray.allocCumulative(numPixels);
      noFilter = FalconArray.allocCounts(1, [1]);

      // add data to aggregation matrix
      for (let i = 0; i < this.data.numRows; i++) {
        // ignore filtered entries
        if (filterMask && filterMask.get(i)) {
          continue;
        }
        const valueActive = activeCol.get(i)!;
        const keyActive = binActive(valueActive)! + 1;
        if (0 <= keyActive && keyActive < numPixels && isNotNull(valueActive)) {
          filter.increment([keyActive]);
        }
        noFilter.increment([0]);
      }

      // falcon magic sauce
      filter.cumulativeSum();
    } else if (view instanceof View1D) {
      let binPassive: BinNumberFunction;
      let binCount: number;

      if (view.dimension.type === "continuous") {
        // continuous bins for passive view that we accumulate across
        const binConfig = view.dimension.binConfig!;
        binPassive = binNumberFunctionContinuous(binConfig);
        binCount = numBinsContinuous(binConfig);
      } else {
        // categorical bins for passive view that we accumulate across
        binPassive = binNumberFunctionCategorical(view.dimension.range!);
        binCount = numBinsCategorical(view.dimension.range!);
      }

      filter = FalconArray.allocCumulative(numPixels * binCount, [
        numPixels,
        binCount,
      ]);
      noFilter = FalconArray.allocCounts(binCount, [binCount]);

      const passiveCol = this.data.getChild(view.dimension.name)!;

      // add data to aggregation matrix
      for (let i = 0; i < this.data.numRows; i++) {
        // ignore filtered entries
        if (filterMask && filterMask.get(i)) {
          continue;
        }

        const valueActive = activeCol.get(i)!;
        const valuePassive = passiveCol.get(i)!;
        const keyActive = binActive(valueActive)! + 1;
        const keyPassive = binPassive(valuePassive)!;
        if (
          0 <= keyPassive &&
          keyPassive < binCount &&
          isNotNull(valuePassive)
        ) {
          if (
            0 <= keyActive &&
            keyActive < numPixels &&
            isNotNull(valueActive)
          ) {
            filter.increment([keyActive, keyPassive]);
          }
          noFilter.increment([keyPassive]);
        }
      }

      for (
        let passiveBinIndex = 0;
        passiveBinIndex < filter.shape[1];
        passiveBinIndex++
      ) {
        // sum across column (passive bin aggregate)
        filter.slice(null, passiveBinIndex).cumulativeSum();
      }
    } else {
      throw Error("only 0D and 1D views");
    }

    return {
      noFilter,
      filter,
    };
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
    for (const [dimension, filter] of filters) {
      let mask: BitSet;
      if (dimension.type === "continuous") {
        mask = this.getContinuousFilterMask(
          dimension,
          filter as ContinuousRange
        )!;
      } else {
        mask = this.getCategoricalFilterMask(
          dimension,
          filter as CategoricalRange
        )!;
      }
      compactIndex.set(dimension, mask);
    }

    return compactIndex;
  }

  /**
   * Gets filter mask given the filter (extent for now)
   *
   * @returns a bitmask of which 1 if the row value should be included or 0 if not
   */
  private getCategoricalFilterMask(
    dimension: CategoricalDimension,
    filter: CategoricalRange
  ): BitSet | undefined {
    const filterSet = new Set(filter);
    const key = `${dimension.name} ${filter}`;

    // if not in the cache, compute it and add it!
    const notFound = !this.filterMaskIndex.has(key);
    if (notFound) {
      // compute filter mask
      const column = this.data.getChild(dimension.name)!;
      const mask = arrowFilterMask(column, (rowValue) =>
        filterSet.has(rowValue)
      );

      // set the cache
      this.filterMaskIndex.set(key, mask);
    }

    // return the value of the mask
    return this.filterMaskIndex.get(key);
  }

  /**
   * Gets filter mask given the filter (extent for now)
   *
   * @returns a bitmask of which 1 if the row value should be included or 0 if not
   */
  private getContinuousFilterMask(
    dimension: ContinuousDimension,
    filter: ContinuousRange
  ): BitSet | undefined {
    const key = `${dimension.name} ${filter}`;

    // if not in the cache, compute it and add it!
    const notFound = !this.filterMaskIndex.has(key);
    if (notFound) {
      // compute filter mask
      const column = this.data.getChild(dimension.name)!;
      const mask = arrowFilterMask(
        column,
        (value: number) => value > filter[0] && value <= filter[1]
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
 * @note should filter => true corresponds to filter out and false keeps
 * @returns a bitmask that indicates if the values should be included (1) or not (0)
 */
function arrowFilterMask<T>(
  column: Vector,
  shouldKeep: (rowValue: T) => boolean
): BitSet {
  const bitmask = new BitSet(column.length);

  /**
   * iterate each row value in the column and decide if we should
   * keep it or not
   *
   * bit 1 indicates filter
   * bit 0 indicates keep
   */
  for (let i = 0; i < column.length; i++) {
    const rowValue: T = column.get(i)!;
    if (!shouldKeep(rowValue)) {
      bitmask.set(i, true);
    }
  }

  return bitmask;
}

/**
 * Takes all unique values and returns it into an array
 *
 * @returns unique values in an array
 */
function arrowColumnUnique(column: Vector): any[] {
  const unique = new Set();
  for (const rowValue of column) {
    unique.add(rowValue);
  }
  return Array.from(unique);
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

function isNotNull(value: any) {
  return value !== null;
}

class LRUMap<K, V> extends Map<K, V> {
  private limit: number;

  /**
   * A Map that only keeps the most recent `limit` number of entries.
   * @param limit - The maximum size of the map.
   */
  constructor(limit: number) {
    super();
    this.limit = limit;
  }

  set(key: K, value: V): this {
    if (this.size >= this.limit) {
      this.delete(this.keys().next().value);
    }
    return super.set(key, value);
  }
}

/**
 * sample defined by
 * $$\sigma^2 = \frac{1}{n} \sum_{i=1}^n (x_i - \mu)^2$$
 *
 * this can probably be optimized faster to be like [the boss](https://github.com/d3/d3-array/blob/main/src/variance.js#L1)
 */
function sampleVariance(vector: Vector) {
  let variance = 0,
    n = vector.length;
  let mu = mean(vector);
  for (const x_i of vector) {
    variance += (x_i - mu) ** 2;
  }
  return n > 1 ? variance / (n - 1) : variance;
}
function mean(vector: Vector) {
  let mean = 0,
    n = vector.length;
  for (const x_i of vector) {
    mean += x_i;
  }
  return mean / n;
}
