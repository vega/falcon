import { Dimension, RangeDimension } from "../dimension";
import { FalconArray } from "../falconArray";
import { numBins } from "../util";
import { View1D } from "../views";
import { FalconDB, Filters, FalconIndex } from "./db";
import type { BinConfig, Interval } from "../util";
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

  protected values(result: Iterable<Record<string, any>>) {
    return result[Symbol.iterator]().next().value;
  }

  protected castBins(input: number) {
    return `${input}`;
  }

  private getName(dimension: Dimension) {
    return this.nameMap?.get(dimension.name) ?? dimension.name;
  }

  private binSQL(dimension: Dimension, binConfig: BinConfig) {
    const field = this.getName(dimension);
    const select = `cast((${field} - ${this.castBins(
      binConfig.start
    )}) / ${this.castBins(binConfig.step)} as int)`;
    const where = `${field} BETWEEN ${binConfig.start} AND ${binConfig.stop}`;

    return {
      select,
      where,
    };
  }

  private getWhereClauses(brushes: Filters) {
    const whereClauses = new Map<Dimension, string>();

    for (const [dimension, extent] of brushes) {
      const field = this.getName(dimension);
      whereClauses.set(
        dimension,
        `${field} BETWEEN ${extent[0]} AND ${extent[1]}`
      );
    }

    return whereClauses;
  }

  async extent(dimension: RangeDimension) {
    const field = this.getName(dimension);
    const result = await this.query(
      `SELECT MIN(${field}) AS _min, MAX(${field}) AS _max
       FROM ${this.table}`
    );
    const { _min, _max } = this.values(result);
    return [_min, _max] as Interval<number>;
  }

  async length() {
    const result = await this.query(
      `SELECT count(*) AS _count
       FROM ${this.table}`
    );
    const { _count } = this.values(result);
    return _count;
  }

  async histogramView1D(view: View1D, filters?: Filters | undefined) {
    // 1. construct binning scheme
    const bin = view.dimension.binConfig!;
    const binCount = numBins(bin);
    const bSql = this.binSQL(view.dimension, bin);

    // 2. allocate memory
    const noFilter = new FalconArray(new Int32Array(binCount));
    const hasFilters = filters && filters.size > 0;
    const filter = hasFilters
      ? new FalconArray(new Int32Array(binCount))
      : noFilter;

    // 3. query and store if we have no filters
    const result = await this.query(
      `SELECT ${bSql.select}
       AS binIndex, count(*) AS binCount
       FROM ${this.table} 
       WHERE ${bSql.where} 
       GROUP BY binIndex`
    );
    for (const { binIndex, binCount } of result) {
      noFilter.set(binIndex, binCount);
    }

    // 4. query and store if we have filters
    if (hasFilters) {
      const where = [...this.getWhereClauses(filters).values()].join(" AND ");
      const result = await this.query(
        `SELECT ${bSql.select}
         AS binIndex, count(*) AS binCount
         FROM ${this.table}
         WHERE ${bSql.where} AND ${where} 
         GROUP BY key`
      );
      for (const { binIndex, binCount } of result) {
        filter.set(binIndex, binCount);
      }
    }

    return { filter, noFilter };
  }

  falconIndexView1D(
    activeView: View1D,
    passiveViews: View[],
    filters: Filters
  ): FalconIndex {
    return {} as FalconIndex;
  }
}
