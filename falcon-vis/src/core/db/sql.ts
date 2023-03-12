import {
  Dimension,
  ContinuousRange,
  CategoricalRange,
  ContinuousDimension,
} from "../dimension";
import { FalconArray } from "../falconArray";
import {
  binNumberFunctionContinuousSQL,
  binNumberFunctionCategorical,
  numBinsCategorical,
  numBinsContinuous,
  stepSize,
} from "../util";
import { View0D, View1D } from "../views";
import { FalconDB, Filters, AsyncIndex, FalconCube } from "./db";
import type { BinConfig } from "../util";
import type { View } from "../views";
import { Row } from "../iterator";

export type SQLNameMap = Map<string, string>;
export type SQLQuery = string;
export type PartialSQLQuery = string;
export type SQLQueryResult = Iterable<Row>;
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

  protected castBins(input: number) {
    return `${input}`;
  }

  /**
   * intermediary function incase we mapped the names to something else
   * change this if you for example have issues with time dimensions
   *
   * @returns mapped string name defined from constructor
   */
  protected getName(dimension: Dimension) {
    return this.nameMap?.get(dimension.name) ?? dimension.name;
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

  async dimensionExists(dimension: Dimension): Promise<boolean> {
    const result = await this.query(
      `SELECT EXISTS 
      (SELECT 0 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${
        this.table
      }' AND COLUMN_NAME = '${this.getName(dimension)}') as _exists`
    );
    const { _exists } = this.getASValues(result);
    return _exists;
  }

  async tableExists(): Promise<boolean> {
    const result = await this.query(
      `SELECT EXISTS 
      (SELECT 0 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${this.table}') as _exists`
    );
    const { _exists } = this.getASValues(result);
    return _exists;
  }

  async entries(
    offset: number = 0,
    length: number = Infinity,
    filters?: Filters
  ) {
    const where = filters
      ? [...this.filtersToSQLWhereClauses(filters).values()].join(" AND ")
      : undefined;
    const filteredTable = await this.query(`SELECT *
              FROM ${this.table}
              ${where ? `WHERE ${where}` : ""}
              ${length >= 0 && length < Infinity ? `LIMIT ${length}` : ""}
              OFFSET ${offset}`);
    return filteredTable;
  }

  async length(filters?: Filters) {
    let filterSQL = "";
    if (filters) {
      filterSQL = [...this.filtersToSQLWhereClauses(filters).values()].join(
        " AND "
      );
    }
    const result = await this.query(
      `SELECT count(*) AS _count
       FROM ${this.table}
       ${filterSQL ? `WHERE ${filterSQL}` : ""}`
    );
    const { _count } = this.getASValues(result);
    return _count;
  }

  async range(dimension: Dimension) {
    const field = this.getName(dimension);
    if (dimension.type === "continuous") {
      const result = await this.query(
        `SELECT  MIN(${field}) AS _min, MAX(${field}) AS _max
        FROM ${this.table}`
      );
      const { _min, _max } = this.getASValues(result);
      return [Number(_min), Number(_max)] as ContinuousRange;
    } else {
      const result = await this.query(
        `SELECT DISTINCT "${field}" AS _unique FROM ${this.table}`
      );

      let range: CategoricalRange[] = [];
      for (const { _unique } of result) {
        range.push(_unique);
      }

      return range.filter((x) => x !== null);
    }
  }

  async histogramView1D(view: View1D, filters?: Filters) {
    let binCount: number;
    let bSql: SQLBin;
    let binIndexMap = (x: any) => x;

    if (view.dimension.type === "continuous") {
      // 1. construct binning scheme
      const bin = view.dimension.binConfig!;
      binCount = numBinsContinuous(bin);
      bSql = this.binSQL(view.dimension, bin);
    } else {
      binCount = numBinsCategorical(view.dimension.range!);
      bSql = this.binSQLCategorical(view.dimension, view.dimension.range!);
      binIndexMap = binNumberFunctionCategorical(view.dimension.range!);
    }

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
      noFilter.set(binIndexMap(binIndex), binCount);
    }

    // 4. query and store if we have filters
    if (hasFilters) {
      const where = [...this.filtersToSQLWhereClauses(filters).values()].join(
        " AND "
      );
      const queryText = `SELECT ${bSql.select}
         AS binIndex, count(*) AS binCount
         FROM ${this.table}
         WHERE ${bSql.where} AND ${where} 
         GROUP BY binIndex`;
      const result = await this.query(queryText);
      console.log(view.dimension.name, queryText);
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

    if (activeView.dimension.type === "continuous") {
      // 1. active bin for each pixel
      const numPixelBins = activeView.dimension.resolution;
      const binActive = this.binSQLPixel(
        activeView.dimension,
        activeView.dimension.binConfig!,
        numPixelBins
      );
      const numPixels = numPixelBins + 1; // for example 10 bins -> 11 total edges (pixels)

      // 2. iterate through passive views and compute cubes
      const promises: Promise<FalconCube>[] = [];
      passiveViews.forEach((view) => {
        const cube = this.cubeSlice1DContinuous(
          view,
          sqlFilters,
          binActive,
          numPixels
        );
        promises.push(cube);
        cubes.set(view, cube);
      });

      // Merge promises into one, when all resolve .then will hit
      Promise.all(promises).then(() => {
        console.info(`Build index: ${performance.now() - t0}ms`);
      });
    } else {
      // 1. active bin for each pixel
      const binActive = this.binSQLCategorical(
        activeView.dimension,
        activeView.dimension.range!
      );
      const numBins = numBinsCategorical(activeView.dimension.range!);
      const binActiveIndexMap = binNumberFunctionCategorical(
        activeView.dimension.range!
      );

      // 2. iterate through passive views and compute cubes
      const promises: Promise<FalconCube>[] = [];
      passiveViews.forEach((view) => {
        const cube = this.cubeSlice1DCategorical(
          view,
          sqlFilters,
          binActive,
          binActiveIndexMap,
          numBins
        );
        promises.push(cube);
        cubes.set(view, cube);
      });

      // Merge promises into one, when all resolve .then will hit
      Promise.all(promises).then(() => {
        console.info(`Build index: ${performance.now() - t0}ms`);
      });
    }

    return cubes;
  }

  async cubeSlice1DCategorical(
    view: View,
    sqlFilters: SQLFilters,
    binActive: SQLBin,
    binActiveIndexMap: (x: any) => number,
    binCountActive: number
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
    let query: SQLQuery = ``;
    let binPassiveIndexMap = (x: any) => x;

    const select = `CASE WHEN ${binActive.where} 
     THEN ${binActive.select}
     ELSE -1 END AS "keyActive",
     count(*) AS cnt`;

    if (view instanceof View0D) {
      filter = FalconArray.allocCounts(binCountActive);
      noFilter = FalconArray.allocCounts(1, [1]);

      query = `SELECT ${select}
         FROM ${this.table} 
         ${where ? `WHERE ${where}` : ""} 
         GROUP BY "keyActive"`;
    } else if (view instanceof View1D) {
      let binPassive: SQLBin;
      let binCount: number;

      if (view.dimension.type === "continuous") {
        // continuous bins for passive view that we accumulate across
        const binConfig = view.dimension.binConfig!;
        binCount = numBinsContinuous(binConfig);
        binPassive = this.binSQL(view.dimension, view.dimension.binConfig!);
      } else {
        // categorical bins for passive view that we accumulate across
        binPassiveIndexMap = binNumberFunctionCategorical(
          view.dimension.range!
        );
        binCount = numBinsCategorical(view.dimension.range!);
        binPassive = this.binSQLCategorical(
          view.dimension,
          view.dimension.range!
        );
      }

      filter = FalconArray.allocCounts(binCountActive * binCount, [
        binCountActive,
        binCount,
      ]);
      noFilter = FalconArray.allocCounts(binCount, [binCount]);

      query = `SELECT ${select}, 
       ${binPassive.select} AS key 
       FROM ${this.table} 
       WHERE ${binPassive.where} ${where ? `AND ${where}` : ""} 
       GROUP BY "keyActive", key`;
    } else {
      throw Error("no 2d view here");
    }

    const result = await this.query(query);

    if (view instanceof View0D) {
      for (const { keyActive, cnt } of result) {
        const binIndex = binActiveIndexMap(keyActive);
        if (binIndex >= 0) {
          filter.set(binIndex, cnt);
        }
        noFilter.increment([0], cnt);
      }
    } else if (view instanceof View1D) {
      for (const { keyActive, key, cnt } of result) {
        const binActiveIndex = binActiveIndexMap(keyActive);
        const binPassiveIndex = binPassiveIndexMap!(key);
        if (binActiveIndex >= 0) {
          filter.set(binActiveIndex, binPassiveIndex, cnt);
        }
        noFilter.increment([binPassiveIndex], cnt);
      }
    } else {
      throw Error();
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
  async cubeSlice1DContinuous(
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
    let binPassiveIndexMap = (x: any) => x;

    const select = `CASE
     WHEN ${binActive.where} 
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
      let passiveBin: SQLBin;
      let binCount: number;
      if (view.dimension.type === "continuous") {
        const binConfig = view.dimension.binConfig!;
        passiveBin = this.binSQL(view.dimension, binConfig);
        binCount = numBinsContinuous(binConfig);
      } else {
        passiveBin = this.binSQLCategorical(
          view.dimension,
          view.dimension.range!
        );
        binCount = numBinsCategorical(view.dimension.range!);
        binPassiveIndexMap = binNumberFunctionCategorical(
          view.dimension.range!
        );
      }

      filter = FalconArray.allocCumulative(numPixels * binCount, [
        numPixels,
        binCount,
      ]);
      noFilter = FalconArray.allocCounts(binCount, [binCount]);

      query = `SELECT ${select}, 
       ${passiveBin.select} AS key 
       FROM ${this.table} 
       WHERE ${passiveBin.where} ${where ? `AND ${where}` : ""} 
       GROUP BY "keyActive", key`;
    } else {
      throw Error("only 0D and 1D views");
    }

    const result = await this.query(query);

    if (view instanceof View0D) {
      for (const { keyActive, cnt } of result) {
        if (keyActive >= 0) {
          filter.set(keyActive + 1, cnt);
        }
        noFilter.increment([0], cnt);
      }

      console.log(filter.toString());

      filter.cumulativeSum();

      console.log(filter.toString());
    } else if (view instanceof View1D) {
      for (const { keyActive, key, cnt } of result) {
        const binPassiveIndex = binPassiveIndexMap(key);
        if (keyActive >= 0) {
          filter.set(keyActive + 1, binPassiveIndex, cnt);
        }
        noFilter.increment([binPassiveIndex], cnt);
      }

      console.log(filter.toString());
      // compute cumulative sums
      for (
        let passiveBinIndex = 0;
        passiveBinIndex < filter.shape[1];
        passiveBinIndex++
      ) {
        // sum across column (passive bin aggregate)
        filter.slice(null, passiveBinIndex).cumulativeSum();
      }
      console.log(filter.toString());
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
  private getASValues(result: Iterable<Row>) {
    return result[Symbol.iterator]().next().value;
  }

  /**
   * Takes the dimension and creates the select and where statement
   * for querying the defined bins
   *
   * @returns select and where statement as strings
   */
  private binSQLCategorical(dimension: Dimension, range: CategoricalRange) {
    const field = this.getName(dimension);
    const select: PartialSQLQuery = `"${field}"`;
    const where = categoricalWhereSQL(field, range);
    return {
      select,
      where,
    };
  }

  /**
   * Takes the dimension and creates the select and where statement
   * for querying the defined bins
   *
   * @returns select and where statement as strings
   */
  private binSQL(dimension: ContinuousDimension, binConfig: BinConfig) {
    const field = this.getName(dimension);
    const select: PartialSQLQuery = binNumberFunctionContinuousSQL(
      field,
      binConfig,
      this.castBins
    );
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

    for (const [dimension, range] of filters) {
      const field = this.getName(dimension);

      let whereClause: PartialSQLQuery;
      if (dimension.type === "continuous") {
        whereClause = `${field} BETWEEN ${range[0]} AND ${range[1]}`;
      } else {
        whereClause = categoricalWhereSQL(field, range);
      }

      whereClauses.set(dimension, whereClause);
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
    dimension: ContinuousDimension,
    binConfig: BinConfig,
    pixels?: number
  ) {
    const step =
      pixels !== undefined ? stepSize(binConfig, pixels) : binConfig.step;
    const start = binConfig.start;
    return this.binSQL(dimension, { ...binConfig, start, step });
  }
}

function categoricalWhereSQL(field: string, range: CategoricalRange) {
  let where = `"${field}" in (`;
  range.forEach((r) => {
    if (r !== null) {
      where += `'${r}', `;
    }
  });
  where += `)`;

  const hasNull = range.findIndex((r) => r === null) !== -1;
  if (hasNull) {
    where += ` OR "${field}" IS NULL`;
  }
  return where;
}
