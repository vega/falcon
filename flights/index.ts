import { App, ArrowDB, Views, TimelineLogger, Logger } from "../src";
import { createElement } from "./utils";

document.getElementById("app")!.innerText = "";

type ViewName =
  | "DISTANCE"
  | "DEP_TIME"
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
  | "DEP_TIME";

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
    format: ".1f"
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
// views.set("ARR_DELAY", {
//   title: "Arrival Delay in Minutes",
//   type: "1D",
//   el: createElement("arr_delay"),
//   dimension: {
//     name: "ARR_DELAY",
//     bins: 25,
//     extent: [-20, 60],
//     format: ".1f"
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

const db = new ArrowDB(require("../data/flights-10k.arrow"));

let logger: Logger<ViewName> | undefined;

//=============
// timeline vis logger

logger = new TimelineLogger(createElement("logs"), views);

//=============
// simple logger as demo

// logger = new SimpleLogger<ViewName>();

new App(views, db, {
  config: {
    // idleTime: 10e9
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
