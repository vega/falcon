import "mapd-connector/dist/browser-connector";
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
    const result = await this.session.queryAsync(q);
    console.info(q, `${Date.now() - t0} ms`);
    return result;
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
    const filters = this.getWhereClauses(brushes);
    const result: DbResult<V> = new Map();

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

        if (view.type === "0D") {
          hists = ndarray(new CUM_ARR_TYPE(numPixels));
          noBrush = ndarray(new HIST_TYPE(1), [1]);

          const [res, resFull] = await Promise.all([
            this.query(`
          SELECT
            ${binActive.select} AS keyActive,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binActive.where} AND ${where}
          GROUP BY keyActive`),
            this.query(`
          SELECT count(*) AS cnt
          FROM ${this.table}
          WHERE ${where}`)
          ]);

          for (const { keyActive, cnt } of res) {
            hists.set(keyActive, cnt);
          }

          for (const { cnt } of resFull) {
            noBrush.set(0, cnt);
          }

          prefixSum(hists);
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

          const [res, resFull] = await Promise.all([
            this.query(`
          SELECT
            ${binActive.select} AS keyActive,
            ${bin.select} as key,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binActive.where} AND ${bin.where} AND ${where}
          GROUP BY keyActive, key`),
            this.query(`
          SELECT
            ${bin.select} as key,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${bin.where} AND ${where}
          GROUP BY key`)
          ]);

          for (const { keyActive, key, cnt } of res) {
            hists.set(keyActive, key, cnt);
          }

          for (const { key, cnt } of resFull) {
            noBrush.set(key, cnt);
          }

          // compute cumulative sums
          for (let x = 0; x < hists.shape[1]; x++) {
            prefixSum(hists.pick(null, x));
          }
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

          const [res, resFull] = await Promise.all([
            this.query(`
          SELECT
            ${binActive.select} AS keyActive,
            ${binX.select} as keyX,
            ${binY.select} as keyY,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binActive.where} AND ${binX.where} AND ${
              binY.where
            } AND ${where}
          GROUP BY keyActive, keyX, keyY`),
            this.query(`
          SELECT
            ${binX.select} as keyX,
            ${binY.select} as keyY,
            count(*) AS cnt
          FROM ${this.table}
          WHERE ${binX.where} AND ${binY.where} AND ${where}
          GROUP BY keyX, keyY`)
          ]);

          for (const { keyActive, keyX, keyY, cnt } of res) {
            hists.set(keyActive, keyX, keyY, cnt);
          }

          for (const { keyX, keyY, cnt } of resFull) {
            noBrush.set(keyX, keyY, cnt);
          }

          // compute cumulative sums
          for (let x = 0; x < hists.shape[1]; x++) {
            for (let y = 0; y < hists.shape[2]; y++) {
              prefixSum(hists.pick(null, x, y));
            }
          }
        }

        result.set(name, { hists, noBrush });
      })
    );

    return result;
  }

  public async loadData2D(
    activeView: View2D<D>,
    pixels: [number, number],
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ) {
    const result = new Map();
    return result;
  }
}

export function connect() {
  const connector = new (window as any).MapdCon();

  const connection = connector
    .protocol("https")
    .host("metis.mapd.com")
    .port("443")
    .dbName("mapd")
    .user("mapd")
    .password("HyperInteractive");

  // const connection = connector
  //   .protocol("https")
  //   .host("beast-azure.mapd.com")
  //   .port("443")
  //   .dbName("newflights")
  //   .user("demouser")
  //   .password("HyperInteractive");

  // field names in flights_donotmodify: ["flight_year", "flight_month", "flight_dayofmonth", "flight_dayofweek", "deptime", "crsdeptime", "arrtime", "crsarrtime", "uniquecarrier", "flightnum", "tailnum", "actualelapsedtime", "crselapsedtime", "airtime", "arrdelay", "depdelay", "origin", "dest", "distance", "taxiin", "taxiout", "cancelled", "cancellationcode", "diverted", "carrierdelay", "weatherdelay", "nasdelay", "securitydelay", "lateaircraftdelay", "dep_timestamp", "arr_timestamp", "carrier_name", "plane_type", "plane_manufacturer", "plane_issue_date", "plane_model", "plane_status", "plane_aircraft_type", "plane_engine_type", "plane_year", "origin_name", "origin_city", "origin_state", "origin_country", "origin_lat", "origin_lon", "dest_name", "dest_city", "dest_state", "dest_country", "dest_lat", "dest_lon", "origin_merc_x", "origin_merc_y", "dest_merc_x", "dest_merc_y"]

  // field names in flights:  ["flight_year", "flight_mmonth", "flight_dayofmonth", "flight_dayofweek", "deptime", "crsdeptime", "arrtime", "crsarrtime", "uniquecarrier", "airline_id", "flightnum", "tail_num", "actualelapsedtime", "crsactualelapsedtime", "airtime", "arrdelay", "depdelay", "origin", "dest", "distance", "taxiin", "taxiout", "wheels_on", "wheels_off", "cancelled", "cancellationcode", "diverted", "carrierdelay", "weatherdelay", "nasdelay", "securitydelay", "lateaircraftdelay", "origin_airport_id", "origin_airport_id_seq", "origin_city", "origin_state_abr", "origin_state_name", "dest_airport_id", "dest_airport_id_seq", "dest_city", "dest_state_abr", "dest_state_name", "origin_world_area_code", "dest_world_area_code", "CRS_dep_time_stamp", "actual_dep_time_stamp", "carrier_name", "plane_type", "plane_manufacturer", "plane_issue_date", "plane_model", "plane_status", "plane_aircraft_type", "plane_engine_type", "plane_year", "origin_name", "origin_country", "origin_lat", "origin_lon", "dest_name", "dest_country", "dest_lat", "dest_lon", "aircraft_engine_num", "aircraft_weight", "aircraft_manufacturer_name", "aircraft_engine_horsepower", "aircraft_number_seats", "aircraft_engine_manufacturer", "aircraft_engine_model_name", "aircraft_engine_thrust", "aircraft_engine_type", "aircraft_category", "aircraft_type", "aircraft_model_name", "aircraft_max_speed_miles"]

  connection
    .connectAsync()
    .then(session => {
      session
        .getTablesAsync()
        .then(console.log)
        .catch(console.error);

      session.getFields("flights_donotmodify", (_, res) => console.log(res));
    })
    .catch(console.error);
}
