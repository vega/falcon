import { Dimension, RangeDimension } from "../dimension";
import { FalconArray } from "../falconArray";
import { numBins, stepSize } from "../util";
import { View0D, View1D } from "../views";
import { FalconDB, Filters, AsyncIndex } from "./db";
import type { BinConfig, Interval } from "../util";
import type { View } from "../views";

export type SQLNameMap = Map<string, string>;
export type SQLQuery = string;
export interface SQLBin {
  select: string;
  where: string;
}
export type SQLFilters = Map<Dimension, string>;

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
    const whereClauses: SQLFilters = new Map();

    for (const [dimension, extent] of brushes) {
      const field = this.getName(dimension);
      whereClauses.set(
        dimension,
        `${field} BETWEEN ${extent[0]} AND ${extent[1]}`
      );
    }

    return whereClauses;
  }

  private binSQLPixel(
    dimension: Dimension,
    binConfig: BinConfig,
    pixels?: number
  ) {
    const step =
      pixels !== undefined ? stepSize(binConfig, pixels) : binConfig.step;
    const start = binConfig.start;
    return this.binSQL(dimension, { ...binConfig, start, step });
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
    const noFilter = FalconArray.allocCounts(binCount);
    const hasFilters = filters && filters.size > 0;
    const filter = hasFilters ? FalconArray.allocCounts(binCount) : noFilter;

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
  ) {
    const t0 = performance.now();

    const sqlFilters = this.getWhereClauses(filters);
    const cubes: AsyncIndex = new Map();

    // 1. active bin for each pixel
    const binActive = this.binSQLPixel(
      activeView.dimension,
      activeView.dimension.binConfig!,
      activeView.dimension.resolution
    );
    const numPixels = activeView.dimension.resolution + 1; // extending by one pixel so we can compute the right diff later

    // 2. iterate through passive views and compute cubes
    const promises: Promise<any>[] = [];
    passiveViews.forEach((view) => {
      const cube = this.cubeSlice1D(view, sqlFilters, binActive, numPixels);
      promises.push(cube);
      cubes.set(view, cube);
    });

    Promise.all(promises).then(() => {
      console.info(`Build index: ${performance.now() - t0}ms`);
    });

    return cubes;
  }

  async cubeSlice1D(
    view: View,
    sqlFilters: SQLFilters,
    binActive: SQLBin,
    numPixels: number
  ) {
    let noFilter: FalconArray;
    let filter: FalconArray;

    const relevantFilters = new Map(sqlFilters);
    if (view instanceof View0D) {
      // use all filters
    } else if (view instanceof View1D) {
      // remove itself from filtering
      relevantFilters.delete(view.dimension);
    }

    const where = [...relevantFilters.values()].join(" AND ");
    let query: string;
    const select = `CASE WHEN ${binActive.where} 
     THEN ${binActive.select}
     ELSE -1 END AS "keyActive",
     count(*) AS cnt`;

    if (view instanceof View0D) {
      filter = FalconArray.allocCumulative(numPixels);
      noFilter = FalconArray.allocCounts(1, [1]);

      query = `SELECT ${select}
         FROM ${this.table} 
         ${where ? `WHERE ${where}` : ""} 
         GROUP BY "keyActive"`;
    } else if (view instanceof View1D) {
      const binConfig = view.dimension.binConfig!;
      const bin = this.binSQL(view.dimension, binConfig);
      const binCount = numBins(binConfig);

      filter = FalconArray.allocCumulative(numPixels * binCount, [
        numPixels,
        binCount,
      ]);
      noFilter = FalconArray.allocCounts(binCount, [binCount]);

      query = `SELECT ${select}, 
       ${bin.select} AS key 
       FROM ${this.table} 
       WHERE ${bin.where} ${where ? `AND ${where}` : ""} 
       GROUP BY "keyActive", key`;
    } else {
      throw Error("only 0D and 1D views");
    }

    const result = await this.query(query);

    if (view instanceof View0D) {
      for (const { keyActive, cnt } of result) {
        if (keyActive >= 0) {
          filter.set(keyActive, cnt);
        }
        noFilter.increment([0], cnt);
      }

      filter.cumulativeSum();
    } else if (view instanceof View1D) {
      for (const { keyActive, key, cnt } of result) {
        if (keyActive >= 0) {
          filter.set(keyActive, key, cnt);
        }
        noFilter.increment([key], cnt);
      }

      // compute cumulative sums
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

    return { filter, noFilter };
  }
}
