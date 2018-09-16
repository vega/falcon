import { MapDDB } from "./../src/db/mapd";
import { App, ArrowDB, Logger, Views, omit, bin } from "../src";
import { createElement } from "../flights/utils";
import { mean, variance, quantile } from "d3-array";

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
    extent: [0, 2000],
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
//     extent: [-60, 140],
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

// const names = new Map<DimensionName, string>();

// names.set("ARR_DELAY", "arrdelay");
// names.set(
//   "ARR_TIME",
//   "(floor(cast(arrtime as float) / 100) + mod(arrtime, 100) / 60)"
// );
// names.set(
//   "DEP_TIME",
//   "(floor(cast(deptime as float) / 100) + mod(deptime, 100) / 60)"
// );
// names.set("DISTANCE", "distance");
// names.set("DEP_DELAY", "depdelay");
// names.set("AIR_TIME", "airtime");

// const db = new MapDDB(
//   {
//     host: "metis.mapd.com",
//     db: "mapd",
//     user: "mapd",
//     password: "HyperInteractive",
//     protocol: "https",
//     port: 443
//   },
//   "flights_donotmodify",
//   names
// );

// const db = new MapDDB(
//   {
//     host: "beast-azure.mapd.com",
//     db: "newflights",
//     user: "demouser",
//     password: "HyperInteractive",
//     protocol: "https",
//     port: 443
//   },
//   "flights",
//   names
// );

const db = new ArrowDB(require("../data/flights-1m.arrow"));

// BENCHMARK: get switching time

async function dbBenchmark() {
  await db.initialize();

  for (const [_name, view] of views) {
    if (view.type === "1D") {
      const binConfig = bin(view.dimension.bins, view.dimension.extent);
      view.dimension.binConfig = binConfig;
    } else if (view.type === "2D") {
      for (const dimension of view.dimensions) {
        const binConfig = bin(dimension.bins, dimension.extent);
        dimension.binConfig = binConfig;
      }
    }
  }

  // warmup
  for (const [name, view] of views) {
    if (view.type === "1D") {
      await db.loadData1D(view, 500, omit(views, name), new Map());
    } else if (view.type === "2D") {
      await db.loadData2D(view, [100, 100], omit(views, name), new Map());
    }
  }

  //*
  // run prefetch for all views
  const runs = 5;

  // high res
  // const [twoDres, oneDres] = [[200, 200] as [number, number], 500];
  // low res
  const [twoDres, oneDres] = [[25, 25] as [number, number], 25];

  const timings: number[] = [];
  for (let i = 0; i < runs; i++) {
    for (const [name, view] of views) {
      const time = performance.now();
      if (view.type === "1D") {
        await db.loadData1D(view, oneDres, omit(views, name), new Map());
      } else if (view.type === "2D") {
        await db.loadData2D(view, twoDres, omit(views, name), new Map());
      }
      await timings.push(performance.now() - time);
    }
  }
  /*/
  // compare resolutions
  const runs = 10;

  const timings: number[] = [];
  for (let i = 0; i < runs; i++) {
    const view = views.get("DISTANCE");
    const time = performance.now();
    if (view.type === "1D") {
      await db.loadData1D(view, 50, omit(views, name), new Map());
    } else if (view.type === "2D") {
      await db.loadData2D(view, [200, 200], omit(views, name), new Map());
    }
    await timings.push(performance.now() - time);
  }

  //*/

  timings.sort((a, b) => a - b);

  console.log("Mean", mean(timings));
  console.log("Median", quantile(timings, 0.5));
  console.log("95 quantile", quantile(timings, 0.95));

  console.log();
  console.log("90 quantile", quantile(timings, 0.9));
  console.log("Stdev", Math.sqrt(variance(timings)));
  console.log("Min", timings[0]);
  console.log("Max", timings[timings.length - 1]);
}

// BENCHMARK: test the db only
window.setTimeout(dbBenchmark, 1000);

// BENCHMARK: get timings for brushing to compare to Square Crossfilter

// new App(views, db, {
//   config: {
//     idleTime: 10e9,
//     histogramWidth: 400
//   },
//   cb: _app => {
//     document.getElementById("loading")!.style.display = "none";

//     //=============
//     // benchmark

//     function animationframe() {
//       return new Promise(resolve => requestAnimationFrame(resolve));
//     }
//     function timeout() {
//       return new Promise(resolve => setTimeout(resolve, 0));
//     }

//     async function benchmark() {
//       _app.prefetchView("ARR_DELAY", false);

//       const timings = new Float32Array(210);
//       const step = 10;

//       // warmup
//       for (let start = -60; start < 140; start += step) {
//         for (let end = start + step; end < 140 + step; end += step) {
//           _app
//             .getVegaView("ARR_DELAY")
//             .signal("brush", [start, end])
//             .run();

//           await animationframe();
//         }
//       }

//       const runs = 5;

//       for (let i = 0; i < runs; i++) {
//         let j = 0;
//         for (let start = -60; start < 140; start += step) {
//           for (let end = start + step; end < 140 + step; end += step) {
//             await animationframe();
//             const time = performance.now();
//             _app
//               .getVegaView("ARR_DELAY")
//               .signal("brush", [start, end])
//               .run();
//             await animationframe();
//             timings[j++] += performance.now() - time;
//           }
//         }
//       }

//       for (let i = 0; i < timings.length; i++) {
//         timings[i] /= runs;
//       }

//       console.log(JSON.stringify(Array.from(timings.values())));
//     }

//     window.setTimeout(benchmark, 1000);
//   }
// });
