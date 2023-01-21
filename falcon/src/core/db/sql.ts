import { RangeDimension } from "../dimension";
import { Interval } from "../util";
import { View1D } from "../views";
import {
  AsyncOrSync,
  BinnedCounts,
  FalconDB,
  Filters,
  FalconIndex,
} from "./db";
import type { View } from "../views";

export type SQLNameMap = Map<string, string>;
export type SQLQuery = string;

export abstract class SQLDB implements FalconDB {
  table: string;
  nameMap: SQLNameMap | undefined;
  constructor(table: string, nameMap?: SQLNameMap) {
    this.table = table;
    this.nameMap = nameMap;
  }

  protected abstract query(q: SQLQuery): Promise<Iterable<Record<string, any>>>;

  extent(dimension: RangeDimension): AsyncOrSync<Interval<number>> {
    return {} as AsyncOrSync<Interval<number>>;
  }

  length(): AsyncOrSync<number> {
    return 0 as AsyncOrSync<number>;
  }

  histogramView1D(
    view: View1D,
    filters?: Filters | undefined
  ): AsyncOrSync<BinnedCounts> {
    return {} as AsyncOrSync<BinnedCounts>;
  }

  falconIndexView1D(
    activeView: View1D,
    passiveViews: View[],
    filters: Filters
  ): FalconIndex {
    return {} as FalconIndex;
  }
}
