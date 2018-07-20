import { DataBase } from "./db";
import "mapd-connector/dist/browser-connector";

export class MapDDb<V, D> {}

export function connect() {
  const connector = new (window as any).MapdCon();

  const connection = connector
    .protocol("https")
    .host("metis.mapd.com")
    .port("443")
    .dbName("mapd")
    .user("mapd")
    .password("HyperInteractive");

  // field names in flights_donotmodify: ["flight_year", "flight_month", "flight_dayofmonth", "flight_dayofweek", "deptime", "crsdeptime", "arrtime", "crsarrtime", "uniquecarrier", "flightnum", "tailnum", "actualelapsedtime", "crselapsedtime", "airtime", "arrdelay", "depdelay", "origin", "dest", "distance", "taxiin", "taxiout", "cancelled", "cancellationcode", "diverted", "carrierdelay", "weatherdelay", "nasdelay", "securitydelay", "lateaircraftdelay", "dep_timestamp", "arr_timestamp", "carrier_name", "plane_type", "plane_manufacturer", "plane_issue_date", "plane_model", "plane_status", "plane_aircraft_type", "plane_engine_type", "plane_year", "origin_name", "origin_city", "origin_state", "origin_country", "origin_lat", "origin_lon", "dest_name", "dest_city", "dest_state", "dest_country", "dest_lat", "dest_lon", "origin_merc_x", "origin_merc_y", "dest_merc_x", "dest_merc_y"]

  // field names in flights:  ["flight_year", "flight_mmonth", "flight_dayofmonth", "flight_dayofweek", "deptime", "crsdeptime", "arrtime", "crsarrtime", "uniquecarrier", "airline_id", "flightnum", "tail_num", "actualelapsedtime", "crsactualelapsedtime", "airtime", "arrdelay", "depdelay", "origin", "dest", "distance", "taxiin", "taxiout", "wheels_on", "wheels_off", "cancelled", "cancellationcode", "diverted", "carrierdelay", "weatherdelay", "nasdelay", "securitydelay", "lateaircraftdelay", "origin_airport_id", "origin_airport_id_seq", "origin_city", "origin_state_abr", "origin_state_name", "dest_airport_id", "dest_airport_id_seq", "dest_city", "dest_state_abr", "dest_state_name", "origin_world_area_code", "dest_world_area_code", "CRS_dep_time_stamp", "actual_dep_time_stamp", "carrier_name", "plane_type", "plane_manufacturer", "plane_issue_date", "plane_model", "plane_status", "plane_aircraft_type", "plane_engine_type", "plane_year", "origin_name", "origin_country", "origin_lat", "origin_lon", "dest_name", "dest_country", "dest_lat", "dest_lon", "aircraft_engine_num", "aircraft_weight", "aircraft_manufacturer_name", "aircraft_engine_horsepower", "aircraft_number_seats", "aircraft_engine_manufacturer", "aircraft_engine_model_name", "aircraft_engine_thrust", "aircraft_engine_type", "aircraft_category", "aircraft_type", "aircraft_model_name", "aircraft_max_speed_miles"]

  // const connection = connector
  //   .protocol("https")
  //   .host("beast-azure.mapd.com")
  //   .port("443")
  //   .dbName("newflights")
  //   .user("demouser")
  //   .password("HyperInteractive");

  connection
    .connectAsync()
    .then(session => {
      session
        .getTablesAsync()
        .then(console.log)
        .catch(console.error);

      session.getFields("flights_donotmodify", (_, res) => console.log(res));

      session
        .queryAsync(
          `SELECT cast(airtime / 20 as float) as key, count(*) as cnt
          FROM flights_donotmodify
          GROUP BY key`
        )
        .then(console.log);
    })
    .catch(console.error);
}
