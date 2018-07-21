import "@mapd/connector/dist/browser-connector";
import ndarray from "ndarray";
import prefixSum from "ndarray-prefix-sum";
import { Dimension, View1D, View2D, Views } from "../api";
import { Interval } from "../basic";
import { numBins, stepSize } from "../util";
import { BinConfig } from "./../api";
import { CUM_ARR_TYPE, HIST_TYPE } from "./../consts";
import { DataBase, DbResult } from "./db";

const connector = new (window as any).MapdCon();

export class MapDDB<V extends string, D extends string>
  implements DataBase<V, D> {
  private session: any;

  constructor(
    private readonly conn: {
      host: string;
      db: string;
      user: string;
      password: string;
    },
    private readonly table: string,
    private readonly nameMap: Map<D, string>
  ) {}

  public async initialize() {
    const connection = connector
      .protocol("https")
      .host(this.conn.host)
      .port("443")
      .dbName(this.conn.db)
      .user(this.conn.user)
      .password(this.conn.password);

    this.session = await connection.connectAsync();
  }

  private async query(q: string): Promise<any> {
    const t0 = Date.now();

    q = q.replace(/\s\s+/g, " ").trim();
    const {
      results,
      timing
      // fields
    } = await this.session.queryAsync(q, {
      returnTiming: true
    });

    console.info(
      "%c" + q,
      "color: #bbb",
      "\nExecution time:",
      timing.execution_time_ms,
      "ms. Total time:",
      timing.total_time_ms,
      "ms. With Network:",
      Date.now() - t0,
      "ms."
    );

    return results;
  }

  private binSQL(dimension: D, binConfig: BinConfig) {
    const field = this.nameMap.get(dimension)!;
    return {
      select: `cast((${field} - ${binConfig.start}) / ${
        binConfig.step
      } as int)`,
      where: `${binConfig.start} <= ${field} AND ${field} < ${binConfig.stop}`
    };
  }

  public async length() {
    const result = await this.query(
      `SELECT count(*) AS cnt FROM ${this.table}`
    );

    return result[0].cnt;
  }

  public async histogram(dimension: Dimension<D>) {
    const bin = dimension.binConfig!;
    const binCount = numBins(bin);
    const bSql = this.binSQL(dimension.name, bin);

    const hist = ndarray(new HIST_TYPE(binCount));

    const result = await this.query(`
      SELECT
        ${bSql.select} AS key,
        count(*) AS cnt
      FROM ${this.table}
      WHERE ${bSql.where}
      GROUP BY key
      `);

    for (const { key, cnt } of result) {
      hist.set(key, cnt);
    }

    return hist;
  }

  public async heatmap(dimensions: [Dimension<D>, Dimension<D>]) {
    const [binX, binY] = dimensions.map(d => d.binConfig!);
    const [numBinsX, numBinsY] = [binX, binY].map(numBins);
    const bSqlX = this.binSQL(dimensions[0].name, binX);
    const bSqlY = this.binSQL(dimensions[1].name, binY);

    const heat = ndarray(new HIST_TYPE(numBinsX * numBinsY), [
      numBinsX,
      numBinsY
    ]);

    const result = await this.query(`
      SELECT
        ${bSqlX.select} AS keyX,
        ${bSqlY.select} AS keyY,
        count(*) AS cnt
      FROM ${this.table}
      WHERE
        ${bSqlX.where} AND ${bSqlY.where}
      GROUP BY keyX, keyY
      `);

    for (const { keyX, keyY, cnt } of result) {
      heat.set(keyX, keyY, cnt);
    }

    return heat;
  }

  private getWhereClauses(brushes: Map<D, Interval<number>>) {
    const filters = new Map<D, string>();

    for (const [dimension, extent] of brushes) {
      const field = this.nameMap.get(dimension)!;
      filters.set(
        dimension,
        `${extent[0]} < ${field} AND ${field} < ${extent[1]}`
      );
    }

    return filters;
  }

  public async loadData1D(
    activeView: View1D<D>,
    pixels: number,
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ) {
    const t0 = Date.now();

    const filters = this.getWhereClauses(brushes);
    const preparedResult = new Map<
      V,
      {
        hists: ndarray;
        noBrushResolve: (resolve: (ndarray) => void) => void;
      }
    >();

    const activeDim = activeView.dimension;
    const activeStepSize = stepSize(activeDim.extent, pixels);
    const binActive = this.binSQL(activeDim.name, {
      start: activeDim.extent[0] - activeStepSize,
      step: activeStepSize,
      stop: activeDim.extent[1]
    });

    const numPixels = pixels + 1; // extending by one pixel so we can compute the right diff later

    await Promise.all(
      Array.from(views.entries()).map(async ([name, view]) => {
        let hists: ndarray;
        let noBrush: ndarray;

        const relevantFilters = new Map(filters);
        if (view.type === "0D") {
          // use all filters
        } else if (view.type === "1D") {
          relevantFilters.delete(view.dimension.name);
        } else {
          relevantFilters.delete(view.dimensions[0].name);
          relevantFilters.delete(view.dimensions[1].name);
        }

        const where =
          Array.from(relevantFilters.values()).join(" AND ") || "true";

        let query: string;
        let fullQuery: string;

        if (view.type === "0D") {
          hists = ndarray(new CUM_ARR_TYPE(numPixels));
          noBrush = ndarray(new HIST_TYPE(1), [1]);

          query = `
          SELECT
            ${binActive.select} AS keyActive,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binActive.where} AND ${where}
          GROUP BY keyActive`;

          fullQuery = `
          SELECT count(*) AS cnt
          FROM ${this.table}
          WHERE ${where}`;
        } else if (view.type === "1D") {
          const dim = view.dimension;

          const binConfig = dim.binConfig!;
          const bin = this.binSQL(dim.name, binConfig);
          const binCount = numBins(binConfig);

          hists = ndarray(new CUM_ARR_TYPE(numPixels * binCount), [
            numPixels,
            binCount
          ]);
          noBrush = ndarray(new HIST_TYPE(binCount), [binCount]);

          query = `
          SELECT
            ${binActive.select} AS keyActive,
            ${bin.select} as key,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binActive.where} AND ${bin.where} AND ${where}
          GROUP BY keyActive, key`;

          fullQuery = `
          SELECT
            ${bin.select} as key,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${bin.where} AND ${where}
          GROUP BY key`;
        } else {
          const dimensions = view.dimensions;
          const binConfigs = dimensions.map(d => d.binConfig!);
          const [numBinsX, numBinsY] = binConfigs.map(numBins);
          const [binX, binY] = [0, 1].map(i =>
            this.binSQL(dimensions[i].name, binConfigs[i])
          );

          hists = ndarray(new CUM_ARR_TYPE(numPixels * numBinsX * numBinsY), [
            numPixels,
            numBinsX,
            numBinsY
          ]);
          noBrush = ndarray(new HIST_TYPE(numBinsX * numBinsY), [
            numBinsX,
            numBinsY
          ]);

          query = `
          SELECT
            ${binActive.select} AS keyActive,
            ${binX.select} as keyX,
            ${binY.select} as keyY,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binActive.where} AND ${binX.where} AND ${
            binY.where
          } AND ${where}
          GROUP BY keyActive, keyX, keyY`;

          fullQuery = `
          SELECT
            ${binX.select} as keyX,
            ${binY.select} as keyY,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binX.where} AND ${binY.where} AND ${where}
          GROUP BY keyX, keyY`;
        }

        const res = await this.query(query);

        if (view.type === "0D") {
          for (const { keyActive, cnt } of res) {
            hists.set(keyActive, cnt);
          }

          prefixSum(hists);
        } else if (view.type === "1D") {
          for (const { keyActive, key, cnt } of res) {
            hists.set(keyActive, key, cnt);
          }

          // compute cumulative sums
          for (let x = 0; x < hists.shape[1]; x++) {
            prefixSum(hists.pick(null, x));
          }
        } else if (view.type === "2D") {
          for (const { keyActive, keyX, keyY, cnt } of res) {
            hists.set(keyActive, keyX, keyY, cnt);
          }

          // compute cumulative sums
          for (let x = 0; x < hists.shape[1]; x++) {
            for (let y = 0; y < hists.shape[2]; y++) {
              prefixSum(hists.pick(null, x, y));
            }
          }
        }

        // we careate a function so that we can start the query after all the other queries have been started
        const noBrushResolve = (resolve: (ndarray) => void) => {
          this.query(fullQuery).then(resFull => {
            let keys: string[] = {
              "0D": ["cnt"],
              "1D": ["key", "cnt"],
              "2D": ["keyX, keyY", "cnt"]
            }[view.type];

            for (const row of resFull) {
              noBrush.set(...keys.map(k => row[k]));
            }

            resolve(noBrush);
          });
        };

        preparedResult.set(name, { hists, noBrushResolve });
      })
    );

    const result: DbResult<V> = new Map();

    for (const [name, res] of preparedResult) {
      result.set(name, {
        hists: res.hists,
        // this starts the queries for the histograms without brushes
        noBrush: new Promise(res.noBrushResolve)
      });
    }

    console.log("Build result cube:" + (Date.now() - t0) + "ms");

    return result;
  }

  public async loadData2D(
    activeView: View2D<D>,
    pixels: [number, number],
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ) {
    const t0 = Date.now();

    const filters = this.getWhereClauses(brushes);
    const preparedResult = new Map<
      V,
      {
        hists: ndarray;
        noBrushResolve: (resolve: (ndarray) => void) => void;
      }
    >();

    const [activeDimX, activeDimY] = activeView.dimensions;
    const activeStepSizeX = stepSize(activeDimX.extent, pixels[0]);
    const activeStepSizeY = stepSize(activeDimY.extent, pixels[1]);
    const binActiveX = this.binSQL(activeDimX.name, {
      start: activeDimX.extent[0] - activeStepSizeX,
      step: activeStepSizeX,
      stop: activeDimX.extent[1]
    });
    const binActiveY = this.binSQL(activeDimY.name, {
      start: activeDimY.extent[0] - activeStepSizeY,
      step: activeStepSizeY,
      stop: activeDimY.extent[1]
    });

    const [numPixelsX, numPixelsY] = [pixels[0] + 1, pixels[1] + 1];

    await Promise.all(
      Array.from(views.entries()).map(async ([name, view]) => {
        let hists: ndarray;
        let noBrush: ndarray;

        const relevantFilters = new Map(filters);
        if (view.type === "0D") {
          // use all filters
        } else if (view.type === "1D") {
          relevantFilters.delete(view.dimension.name);
        } else {
          relevantFilters.delete(view.dimensions[0].name);
          relevantFilters.delete(view.dimensions[1].name);
        }

        const where =
          Array.from(relevantFilters.values()).join(" AND ") || "true";

        let query: string;
        let fullQuery: string;

        if (view.type === "0D") {
          hists = ndarray(new CUM_ARR_TYPE(numPixelsX * numPixelsY));
          noBrush = ndarray(new HIST_TYPE(1), [1]);

          query = `
          SELECT
            ${binActiveX.select} AS keyActiveX,
            ${binActiveY.select} AS keyActiveY,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binActiveX.where} AND ${binActiveY.where} AND ${where}
          GROUP BY keyActiveX, keyActiveY`;

          fullQuery = `
          SELECT count(*) AS cnt
          FROM ${this.table}
          WHERE ${where}`;
        } else if (view.type === "1D") {
          const dim = view.dimension;

          const binConfig = dim.binConfig!;
          const bin = this.binSQL(dim.name, binConfig);
          const binCount = numBins(binConfig);

          hists = ndarray(
            new CUM_ARR_TYPE(numPixelsX * numPixelsY * binCount),
            [numPixelsX, numPixelsY, binCount]
          );
          noBrush = ndarray(new HIST_TYPE(binCount), [binCount]);

          query = `
          SELECT
            ${binActiveX.select} AS keyActiveX,
            ${binActiveY.select} AS keyActiveY,
            ${bin.select} as key,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binActiveX.where} AND ${binActiveY.where} AND ${
            bin.where
          } AND ${where}
          GROUP BY keyActiveX, keyActiveY, key`;

          fullQuery = `
          SELECT
            ${bin.select} as key,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${bin.where} AND ${where}
          GROUP BY key`;
        } else {
          const dimensions = view.dimensions;
          const binConfigs = dimensions.map(d => d.binConfig!);
          const [numBinsX, numBinsY] = binConfigs.map(numBins);
          const [binX, binY] = [0, 1].map(i =>
            this.binSQL(dimensions[i].name, binConfigs[i])
          );

          hists = ndarray(
            new CUM_ARR_TYPE(numPixelsX * numPixelsY * numBinsX * numBinsY),
            [numPixelsX, numPixelsY, numBinsX, numBinsY]
          );
          noBrush = ndarray(new HIST_TYPE(numBinsX * numBinsY), [
            numBinsX,
            numBinsY
          ]);

          query = `
          SELECT
            ${binActiveX.select} AS keyActiveX,
            ${binActiveY.select} AS keyActiveY,
            ${binX.select} as keyX,
            ${binY.select} as keyY,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binActiveX.where} AND ${binActiveY.where} AND ${
            binX.where
          } AND ${binY.where} AND ${where}
          GROUP BY keyActiveX, keyActiveY, keyX, keyY`;

          fullQuery = `
          SELECT
            ${binX.select} as keyX,
            ${binY.select} as keyY,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binX.where} AND ${binY.where} AND ${where}
          GROUP BY keyX, keyY`;
        }

        const res = await this.query(query);

        if (view.type === "0D") {
          for (const { keyActiveX, keyActiveY, cnt } of res) {
            hists.set(keyActiveX, keyActiveY, cnt);
          }

          prefixSum(hists);
        } else if (view.type === "1D") {
          for (const { keyActiveX, keyActiveY, key, cnt } of res) {
            hists.set(keyActiveX, keyActiveY, key, cnt);
          }

          // compute cumulative sums
          for (let x = 0; x < hists.shape[1]; x++) {
            prefixSum(hists.pick(null, null, x));
          }
        } else if (view.type === "2D") {
          for (const { keyActiveX, keyActiveY, keyX, keyY, cnt } of res) {
            hists.set(keyActiveX, keyActiveY, keyX, keyY, cnt);
          }

          // compute cumulative sums
          for (let x = 0; x < hists.shape[1]; x++) {
            for (let y = 0; y < hists.shape[2]; y++) {
              prefixSum(hists.pick(null, null, x, y));
            }
          }
        }

        // we careate a function so that we can start the query after all the other queries have been started
        const noBrushResolve = (resolve: (ndarray) => void) => {
          this.query(fullQuery).then(resFull => {
            let keys: string[] = {
              "0D": ["cnt"],
              "1D": ["key", "cnt"],
              "2D": ["keyX, keyY", "cnt"]
            }[view.type];

            for (const row of resFull) {
              noBrush.set(...keys.map(k => row[k]));
            }

            resolve(noBrush);
          });
        };

        preparedResult.set(name, { hists, noBrushResolve });
      })
    );

    const result: DbResult<V> = new Map();

    for (const [name, res] of preparedResult) {
      result.set(name, {
        hists: res.hists,
        // this starts the queries for the histograms without brushes
        noBrush: new Promise(res.noBrushResolve)
      });
    }

    console.log("Build result cube:" + (Date.now() - t0) + "ms");

    return result;
  }
}
