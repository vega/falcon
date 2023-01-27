import { Dimension, ContinuousDimension } from "../dimension";
import { FalconArray } from "../falconArray";
import { numBins, stepSize } from "../util";
import { View0D, View1D } from "../views";
import { FalconDB, Filters, AsyncIndex, FalconCube } from "./db";
import type { BinConfig, Interval } from "../util";
import type { View } from "../views";

export type SQLNameMap = Map<string, string>;
export type SQLQuery = string;
export type PartialSQLQuery = string;
export type SQLQueryResult = Iterable<Record<string, any>>;
export interface SQLBin {
  select: PartialSQLQuery;
  where: PartialSQLQuery;
}
export type SQLFilters = Map<Dimension, PartialSQLQuery>;

export abstract class SQLDB implements FalconDB {
  table: string;
  nameMap: SQLNameMap | undefined;
  constructor(table: string, nameMap?: SQLNameMap) {
    this.table = table;
    this.nameMap = nameMap;
  }

  /**
   * After extending SQLDB, all you implement is the query!
   * This should take in a string SQL query and return the results
   *
   * @note Check out duckdb.ts or mapd.ts for examples.
   */
  protected abstract query(
    q: SQLQuery
  ): SQLQueryResult | Promise<SQLQueryResult>;

  async length() {
    const result = await this.query(
      `SELECT count(*) AS _count
       FROM ${this.table}`
    );
    const { _count } = this.getASValues(result);
    return _count;
  }

  async range(dimension: ContinuousDimension) {
    const field = this.getName(dimension);
    const result = await this.query(
      `SELECT MIN(${field}) AS _min, MAX(${field}) AS _max
       FROM ${this.table}`
    );
    const { _min, _max } = this.getASValues(result);
    return [_min, _max] as Interval<number>;
  }

  async histogramView1D(view: View1D, filters?: Filters) {
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
      const where = [...this.filtersToSQLWhereClauses(filters).values()].join(
        " AND "
      );
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

    const sqlFilters = this.filtersToSQLWhereClauses(filters);
    const cubes: AsyncIndex = new Map();

    // 1. active bin for each pixel
    const binActive = this.binSQLPixel(
      activeView.dimension,
      activeView.dimension.binConfig!,
      activeView.dimension.resolution
    );
    const numPixels = activeView.dimension.resolution + 1; // extending by one pixel so we can compute the right diff later

    // 2. iterate through passive views and compute cubes
    const promises: Promise<FalconCube>[] = [];
    passiveViews.forEach((view) => {
      const cube = this.cubeSlice1D(view, sqlFilters, binActive, numPixels);
      promises.push(cube);
      cubes.set(view, cube);
    });

    // Merge promises into one, when all resolve .then will hit
    Promise.all(promises).then(() => {
      console.info(`Build index: ${performance.now() - t0}ms`);
    });

    return cubes;
  }

  /**
   * Takes a view and computes the falcon cube for that passive view
   * more details in the [paper](https://idl.cs.washington.edu/files/2019-Falcon-CHI.pdf)
   *
   * @note Only works for 0D and 1D continuous views at the moment
   * @returns a cube as FalconArray for the passive view
   */
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
    let query: SQLQuery;
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

  /**
   * Easily extract the "as" values from the SQL query
   *
   * @returns a dictionary that you can index values from the result
   */
  private getASValues(result: Iterable<Record<string, any>>) {
    return result[Symbol.iterator]().next().value;
  }

  /**
   * intermediary function incase we mapped the names to something else
   *
   * @returns mapped string name defined from constructor
   */
  private getName(dimension: Dimension) {
    return this.nameMap?.get(dimension.name) ?? dimension.name;
  }

  /**
   * Takes the dimension and creates the select and where statement
   * for querying the defined bins
   *
   * @returns select and where statement as strings
   */
  private binSQL(dimension: Dimension, binConfig: BinConfig) {
    const field = this.getName(dimension);
    const select: PartialSQLQuery = `cast((${field} - ${binConfig.start}) / ${binConfig.step} as int)`;
    const where: PartialSQLQuery = `${field} BETWEEN ${binConfig.start} AND ${binConfig.stop}`;

    return {
      select,
      where,
    };
  }

  /**
   * Converts the filters (intervals) into SQL WHERE clauses as strings
   *
   * @returns map of filters but in string format that can be queried with SQL
   * instead of Intervals
   */
  private filtersToSQLWhereClauses(filters: Filters) {
    const whereClauses: SQLFilters = new Map();

    for (const [dimension, extent] of filters) {
      const field = this.getName(dimension);
      whereClauses.set(
        dimension,
        `${field} BETWEEN ${extent[0]} AND ${extent[1]}`
      );
    }

    return whereClauses;
  }

  /**
   * Constructs SQL select and where clause over the total number
   * of pixels/resolution
   *
   * @returns select and where statement as strings
   */
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
}
