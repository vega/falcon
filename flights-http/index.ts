import { createElement } from "../flights/utils";
import { App, Views } from "../src";
import { HTTPDB } from "../src/db/http";

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

const db = new HTTPDB(
  "http://localhost:5100/api/query?query=",
  "flights_donotmodify",
  names
);

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
