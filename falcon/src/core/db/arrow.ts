import { BitSet } from "../bitset";
import { FalconDB } from "./db";
import { View1D } from "../views";
import type {
  DimensionFilters,
  AsyncOrSync,
  FalconIndex,
  FalconArray,
} from "./db";
import type { Dimension } from "../dimension";
import type { Interval } from "../util";
import type { View } from "../views";
import type { Table, Vector } from "apache-arrow";

export class ArrowDB implements FalconDB {
  readonly blocking: boolean;
  data: Table;
  filterMaskIndex: Map<Dimension, BitSet>;

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

  loadAll1D(
    view: View1D,
    filters?: DimensionFilters
  ): AsyncOrSync<FalconArray> {
    view;
    filters;
    return {} as AsyncOrSync<FalconArray>;
  }

  //@ts-ignore
  loadIndex1D(
    activeView: View1D,
    passiveViews: View[],
    filters?: DimensionFilters
  ): FalconIndex {
    activeView;
    passiveViews;
    filters;
    return {} as FalconIndex;
  }
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
