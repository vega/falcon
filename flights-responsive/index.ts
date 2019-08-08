import { App, ArrowDB, Logger, Views } from "../src";
import { createElement } from "./utils";

document.getElementById("app")!.innerText = "";

type ViewName =
  | "DEP_TIME"
  | "ARR_TIME";

type DimensionName =
  | "ARR_TIME"
  | "DEP_TIME";

const views: Views<ViewName, DimensionName> = new Map();

views.set("ARR_TIME", {
  title: "Arrival Time",
  type: "1D",
  el: createElement("arrival", 2),
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
  el: createElement("departure", 2),
  dimension: {
    name: "DEP_TIME",
    bins: 24,
    extent: [0, 24],
    format: ".1f"
  }
});

const url = require("../data/flights-10k.arrow");
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
    barWidth: 600,
    fillColor: '#00f0ff',
    responsive: true,
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
