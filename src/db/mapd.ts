import { BinConfig } from "./../api";
import { HIST_TYPE } from "./../consts";
import "mapd-connector/dist/browser-connector";
import ndarray from "ndarray";
import { Dimension, View1D, View2D, Views } from "../api";
import { Interval } from "../basic";
import { DataBase } from "./db";
import { numBins } from "../util";

const connector = new (window as any).MapdCon();

const NAME_MAP = {
  ARR_DELAY: "arrdelay",
  ARR_TIME: "floor(cast(arrtime as float) / 100) + mod(arrtime, 100) / 60",
  DEP_TIME: "floor(cast(deptime as float) / 100) + mod(deptime, 100) / 60",
  DISTANCE: "distance",
  DEP_DELAY: "depdelay",
  AIR_TIME: "airtime"
};

export class MapDDB<V extends string, D extends string>
  implements DataBase<V, D> {
  private session: any;

  public async initialize() {
    const connection = connector
      .protocol("https")
      .host("metis.mapd.com")
      .port("443")
      .dbName("mapd")
      .user("mapd")
      .password("HyperInteractive");

    this.session = await connection.connectAsync();
  }

  private async query(q: string): Promise<any> {
    const t0 = Date.now();
    const result = await this.session.queryAsync(q);
    console.info(q, `${Date.now() - t0} ms`);
    return result;
  }

  private binSQL(field: string, binConfig: BinConfig) {
    return {
      select: `floor((cast(${field} as float) - ${binConfig.start}) / ${
        binConfig.step
      })`,
      where: `${binConfig.start} <= ${field} AND ${field} < ${binConfig.stop}`
    };
  }

  public async length() {
    const result = await this.query(
      `select count(*) as cnt from flights_donotmodify`
    );

    return result[0].cnt;
  }

  public async histogram(dimension: Dimension<D>) {
    const bin = dimension.binConfig!;
    const binCount = numBins(bin);
    const field = NAME_MAP[dimension.name as string];
    const bSql = this.binSQL(field, bin);

    const hist = ndarray(new HIST_TYPE(binCount));

    const result = await this.query(`
      SELECT
        ${bSql.select} as key,
        count(*) as cnt
      FROM flights_donotmodify
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
    const [fieldX, fieldY] = dimensions.map(d => NAME_MAP[d.name as string]);
    const bSqlX = this.binSQL(fieldX, binX);
    const bSqlY = this.binSQL(fieldY, binY);

    const heat = ndarray(new HIST_TYPE(numBinsX * numBinsY), [
      numBinsX,
      numBinsY
    ]);

    const result = await this.query(`
      SELECT
        ${bSqlX.select} as keyX,
        ${bSqlY.select} as keyY,
        count(*) as cnt
      FROM flights_donotmodify
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
      filters.set(
        dimension,
        `${extent[0]} < ${dimension} AND ${dimension} < ${extent[1]}`
      );
    }

    return filters;
  }

  public loadData1D(
    activeView: View1D<D>,
    pixels: number,
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ) {
    const wheres = this.getWhereClauses(brushes);

    console.log(wheres);

    const result = new Map();
    return result;
  }

  public loadData2D(
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
