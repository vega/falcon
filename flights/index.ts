import { App, ArrowDB, Logger, Views } from "../src";
import { createElement } from "./utils";

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
// views.set("FL_DATE", {
//   title: "Flight Date",
//   type: "1D",
//   el: createElement("date"),
//   dimension: {
//     name: "FL_DATE",
//     bins: 25,
//     // note that months start at 0!
//     // extent: [new Date(2005, 11, 25).getTime(), new Date(2006, 1, 5).getTime()], // 10k
//     extent: [new Date(2005, 11, 25).getTime(), new Date(2006, 2, 5).getTime()], // 1m
//     // extent: [new Date(2006, 11, 10).getTime(), new Date(2007, 1, 10).getTime()], // 10m
//     // extent: [new Date(2005, 11, 29).getTime(), new Date(2006, 1, 5).getTime()], // 200k
//     format: "%Y-%m-%d",
//     time: true
//   }
// });
views.set("DISTANCE", {
  title: "Distance in Miles",
  type: "1D",
  el: createElement("distance"),
  dimension: {
    name: "DISTANCE",
    bins: 40,
    extent: [0, 4000],
    format: "d"
  }
});
// views.set("ARR_TIME", {
//   title: "Arrival Time",
//   type: "1D",
//   el: createElement("arrival"),
//   dimension: {
//     name: "ARR_TIME",
//     bins: 24,
//     extent: [0, 24],
//     format: ".1f"
//   }
// });
views.set("DEP_TIME", {
  title: "Departure Time",
  type: "1D",
  el: createElement("departure"),
  dimension: {
    name: "DEP_TIME",
    bins: 24,
    extent: [0, 24],
    format: ".1f"
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
//     format: ".1f"
//   }
// });
views.set("ARR_DELAY", {
  title: "Arrival Delay in Minutes",
  type: "1D",
  el: createElement("arr_delay"),
  dimension: {
    name: "ARR_DELAY",
    bins: 25,
    extent: [-60, 180],
    format: ".1f"
  }
});
// views.set("AIR_TIME", {
//   title: "Airtime in Minutes",
//   type: "1D",
//   el: createElement("airtime"),
//   dimension: {
//     name: "AIR_TIME",
//     bins: 25,
//     extent: [0, 500],
//     format: "d"
//   }
// });
// views.set("DEP_DELAY_ARR_DELAY", {
//   title: "Arrival and Departure Delay in Minutes",
//   type: "2D",
//   el: createElement("delay"),
//   dimensions: [
//     {
//       title: "Departure Delay",
//       name: "DEP_DELAY",
//       bins: 25,
//       extent: [-20, 60],
//       format: "d"
//     },
//     {
//       title: "Arrival Delay",
//       name: "ARR_DELAY",
//       bins: 25,
//       extent: [-20, 60],
//       format: "d"
//     }
//   ]
});

const url = require("../data/flights-1m.arrow");
// const url =
//   "https://media.githubusercontent.com/media/uwdata/flights-arrow/master/flights-10m.arrow";
const db = new ArrowDB<ViewName, DimensionName>(url);

let logger: Logger<ViewName> | undefined;

//=============
// timeline vis logger

// logger = new TimelineLogger(createElement("logs"), views);

//=============
// simple logger as demo

// logger = new SimpleLogger<ViewName>();

const iPad = !!navigator.userAgent.match(/iPad/i);

new App(views, db, {
  config: {
    barWidth: 800,
    showUnfiltered: false,
    zeroD: "vbar",
    barHeight: 600,
    toggleUnfiltered: false,
    renderer: "svg",
    ...(iPad
      ? {
          barWidth: 450,
          histogramWidth: 450,
          histogramHeight: 120,
          heatmapWidth: 300,
          prefetchOn: "mousedown"
        }
      : {})
  },
  logger: logger,
  cb: _app => {
    document.getElementById("loading")!.style.display = "none";

    //=============
    // benchmark

    // function animationframe() {
    //   return new Promise(resolve => requestAnimationFrame(resolve));
    // }

    // async function benchmark() {
    //   _app.prefetchView("AIR_TIME", false);

    //   console.time("Brushes");
    //   const step = 25;
    //   for (let start = 0; start < 500; start += step) {
    //     for (let end = start + step; end < 500 + step; end += step) {
    //       _app
    //         .getVegaView("AIR_TIME")
    //         .signal("brush", [start, end])
    //         .run();

    //       await animationframe();
    //     }
    //   }
    //   console.timeEnd("Brushes");
    // }

    // window.setTimeout(benchmark, 1000);
  }
});
