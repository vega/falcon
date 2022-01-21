import { createElement } from "../flights/utils";
import { App, DuckDB, Views } from "../src";

document.getElementById("app")!.innerText = "";

type ViewName =
  | "DISTANCE"
  | "DEP_TIME"
  | "ARR_TIME"
  | "AIR_TIME"
  | "ARR_DELAY"
  | "DEP_DELAY"
  | "FL_DATE"
  | "DEP_DELAY_ARR_DELAY"
  | "COUNT";

type DimensionName =
  | "ARR_DELAY"
  | "ARR_TIME"
  | "DISTANCE"
  | "DEP_DELAY"
  | "AIR_TIME"
  | "DEP_TIME"
  | "FL_DATE";

const views: Views<ViewName, DimensionName> = new Map();

views.set("COUNT", {
  title: "Flights selected",
  type: "0D",
  el: createElement("count")
});
views.set("FL_DATE", {
  title: "Flight Date",
  type: "1D",
  el: createElement("date"),
  dimension: {
    name: "FL_DATE",
    bins: 25,
    // note that months start at 0!
    // extent: [new Date(2005, 11, 25).getTime(), new Date(2006, 1, 5).getTime()], // 10k
    extent: [new Date(2005, 11, 25).getTime(), new Date(2006, 2, 5).getTime()], // 1m
    // extent: [new Date(2006, 11, 10).getTime(), new Date(2007, 1, 10).getTime()], // 10m
    // extent: [new Date(2005, 11, 29).getTime(), new Date(2006, 1, 5).getTime()], // 200k
    format: "%Y-%m-%d",
    time: true
  }
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

names.set("FL_DATE", "epoch(FL_DATE)*1000");

// get files from https://gist.github.com/domoritz/fd517a3a3a210c24a488e61870e2cf2c
// const url = require("../data/flights-10m.parquet");
const url = require("../data/flights-1m.parquet");
const db = new DuckDB<ViewName, DimensionName>(url, names);

new App(views, db, {
  config: {
    barWidth: 600,
    prefetchOn: "mousedown"
  },
  cb: () => (document.getElementById("loading")!.style.display = "none")
});
