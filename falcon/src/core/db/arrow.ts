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
import type { Table } from "apache-arrow";

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

  length(): AsyncOrSync<number> {
    return 0 as AsyncOrSync<number>;
  }
  extent(dimension: Dimension): AsyncOrSync<Interval<number>> {
    return {} as AsyncOrSync<Interval<number>>;
  }
  load1DAll(
    view: View1D,
    filters?: DimensionFilters
  ): AsyncOrSync<FalconArray> {
    return {} as AsyncOrSync<FalconArray>;
  }
  load1DIndex(
    activeView: View1D,
    passiveViews: View[],
    filters?: DimensionFilters
  ): FalconIndex {
    return {} as FalconIndex;
  }
}
