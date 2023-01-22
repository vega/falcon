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

  private values(result: Iterable<Record<string, any>>) {
    return result[Symbol.iterator]().next().value;
  }

  async extent(dimension: RangeDimension) {
    const field = dimension.name;
    const result = await this.query(
      `SELECT MIN(${field}) AS _min, MAX(${field}) AS _max FROM ${this.table}`
    );
    const { _min, _max } = this.values(result);
    return [_min, _max] as Interval<number>;
  }

  async length() {
    const result = await this.query(
      `SELECT count(*) AS _count FROM ${this.table}`
    );
    const { _count } = this.values(result);
    return _count;
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
