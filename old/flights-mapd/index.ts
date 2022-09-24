import { App, MapDDB, Views } from "../src";
import { createElement } from "../flights/utils";

document.getElementById("app")!.innerText = "";

type ViewName =
  | "DISTANCE"
  | "DEP_TIME"
  | "DEP_TS"
  | "ARR_TIME"
  | "AIR_TIME"
  | "ARR_DELAY"
  | "DEP_DELAY"
  | "DEP_DELAY_ARR_DELAY"
  | "COUNT";

type DimensionName =
  | "ARR_DELAY"
  | "ARR_TIME"
  | "DISTANCE"
  | "DEP_DELAY"
  | "AIR_TIME"
  | "DEP_TIME"
  | "DEP_TS";

const views: Views<ViewName, DimensionName> = new Map();

views.set("COUNT", {
  title: "Flights selected",
  type: "0D",
  el: createElement("count")
});
views.set("DISTANCE", {
  title: "Distance in Miles",
  type: "1D",
  el: createElement("distance"),
  dimension: {
    name: "DISTANCE",
    bins: 25,
    extent: [0, 4000],
    format: "d"
  }
});
views.set("ARR_TIME", {
  title: "Arrival Time",
  type: "1D",
  el: createElement("arrival"),
  dimension: {
    name: "ARR_TIME",
    bins: 24,
    extent: [0, 24],
    format: ".1~f"
  }
});
views.set("DEP_TIME", {
  title: "Departure Time",
  type: "1D",
  el: createElement("departure"),
  dimension: {
    name: "DEP_TIME",
    bins: 24,
    extent: [0, 24],
    format: ".1~f"
  }
});
views.set("DEP_TS", {
  title: "Departure Date",
  type: "1D",
  el: createElement("date"),
  dimension: {
    name: "DEP_TS",
    bins: 24,
    // note that months start at 0!
    // extent: [new Date(2007, 11, 31).getTime(), new Date(2009, 0, 1).getTime()], /// 7M
    extent: [new Date(1987, 0, 1).getTime(), Date.now()], // 180M
    format: "%Y-%m-%d %H:%M",
    time: true
  }
});
// views.set("DEP_DELAY", {
//   title: "Departure Delay in Minutes",
//   type: "1D",
//   el: createElement("dep_delay"),
//   dimension: {
//     name: "DEP_DELAY",
//     bins: 25,
//     extent: [-20, 60],
//     format: ".1~f"
//   }
// });
// views.set("ARR_DELAY", {
//   title: "Arrival Delay in Minutes",
//   type: "1D",
//   el: createElement("arr_delay"),
//   dimension: {
//     name: "ARR_DELAY",
//     bins: 25,
//     extent: [-20, 60],
//     format: ".1~f"
//   }
// });
views.set("AIR_TIME", {
  title: "Airtime in Minutes",
  type: "1D",
  el: createElement("airtime"),
  dimension: {
    name: "AIR_TIME",
    bins: 25,
    extent: [0, 500],
    format: "d"
  }
});
views.set("DEP_DELAY_ARR_DELAY", {
  title: "Arrival and Departure Delay in Minutes",
  type: "2D",
  el: createElement("delay"),
  dimensions: [
    {
      title: "Departure Delay",
      name: "DEP_DELAY",
      bins: 25,
      extent: [-20, 60],
      format: "d"
    },
    {
      title: "Arrival Delay",
      name: "ARR_DELAY",
      bins: 25,
      extent: [-20, 60],
      format: "d"
    }
  ]
});

const names = new Map<DimensionName, string>();

names.set("ARR_DELAY", "arrdelay");
names.set(
  "ARR_TIME",
  "(cast(cast(arrtime as float) / 100 as int) + mod(arrtime, 100) / 60)"
);
names.set(
  "DEP_TIME",
  "(cast(cast(deptime as float) / 100 as int) + mod(deptime, 100) / 60)"
);
names.set("DISTANCE", "distance");
names.set("DEP_DELAY", "depdelay");
names.set("AIR_TIME", "airtime");

//*  <- add or remove / to toggle
names.set("DEP_TS", "extract(epoch from dep_timestamp) * 1000");

// FIXME: the time view does not update correctly for the small dataset
views.delete("DEP_TS");

const db = new MapDDB(
  {
    host: "metis.mapd.com",
    db: "mapd",
    user: "mapd",
    password: "HyperInteractive",
    protocol: "https",
    port: 443
  },
  "flights_donotmodify",
  names
);

/*/

names.set("DEP_TS", "extract(epoch from actual_dep_time_stamp) * 1000");

const db = new MapDDB(
  {
    host: "beast-azure.mapd.com",
    db: "newflights",
    user: "demouser",
    password: "HyperInteractive",
    protocol: "https",
    port: 443
  },
  "flights",
  names
);

//**/

new App(views, db, {
  config: {
    histogramHeight: 130,
    heatmapWidth: 320,
    maxCircleSize: 500,
    barWidth: 600,
    interpolate: true,
    progressiveInteractions: "only2D",
    prefetchOn: "mousedown"
  },
  cb: () => (document.getElementById("loading")!.style.display = "none")
});

// field names in flights_donotmodify:
// ["flight_year", "flight_month", "flight_dayofmonth", "flight_dayofweek", "deptime", "crsdeptime", "arrtime", "crsarrtime", "uniquecarrier", "flightnum", "tailnum", "actualelapsedtime", "crselapsedtime", "airtime", "arrdelay", "depdelay", "origin", "dest", "distance", "taxiin", "taxiout", "cancelled", "cancellationcode", "diverted", "carrierdelay", "weatherdelay", "nasdelay", "securitydelay", "lateaircraftdelay", "dep_timestamp", "arr_timestamp", "carrier_name", "plane_type", "plane_manufacturer", "plane_issue_date", "plane_model", "plane_status", "plane_aircraft_type", "plane_engine_type", "plane_year", "origin_name", "origin_city", "origin_state", "origin_country", "origin_lat", "origin_lon", "dest_name", "dest_city", "dest_state", "dest_country", "dest_lat", "dest_lon", "origin_merc_x", "origin_merc_y", "dest_merc_x", "dest_merc_y"]

// field names in flights:
// ["flight_year", "flight_mmonth", "flight_dayofmonth", "flight_dayofweek", "deptime", "crsdeptime", "arrtime", "crsarrtime", "uniquecarrier", "airline_id", "flightnum", "tail_num", "actualelapsedtime", "crsactualelapsedtime", "airtime", "arrdelay", "depdelay", "origin", "dest", "distance", "taxiin", "taxiout", "wheels_on", "wheels_off", "cancelled", "cancellationcode", "diverted", "carrierdelay", "weatherdelay", "nasdelay", "securitydelay", "lateaircraftdelay", "origin_airport_id", "origin_airport_id_seq", "origin_city", "origin_state_abr", "origin_state_name", "dest_airport_id", "dest_airport_id_seq", "dest_city", "dest_state_abr", "dest_state_name", "origin_world_area_code", "dest_world_area_code", "CRS_dep_time_stamp", "actual_dep_time_stamp", "carrier_name", "plane_type", "plane_manufacturer", "plane_issue_date", "plane_model", "plane_status", "plane_aircraft_type", "plane_engine_type", "plane_year", "origin_name", "origin_country", "origin_lat", "origin_lon", "dest_name", "dest_country", "dest_lat", "dest_lon", "aircraft_engine_num", "aircraft_weight", "aircraft_manufacturer_name", "aircraft_engine_horsepower", "aircraft_number_seats", "aircraft_engine_manufacturer", "aircraft_engine_model_name", "aircraft_engine_thrust", "aircraft_engine_type", "aircraft_category", "aircraft_type", "aircraft_model_name", "aircraft_max_speed_miles"]
