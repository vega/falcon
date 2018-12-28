import { mean, variance, quantile } from "d3-array";
import { App, ArrowDB, Views, omit, bin } from "../src";
import { createElement } from "../flights/utils";

document.getElementById("app")!.innerText = "";

type ViewName =
  | "ELEVATION"
  | "TEMP_MIN"
  | "TEMP_MAX"
  | "PRECIPITATION"
  | "WIND"
  | "SNOW"
  | "COUNT";

type DimensionName =
  | "ELEVATION"
  | "LATITUDE"
  | "LONGITUDE"
  | "RECORD_DATE"
  | "TEMP_MIN"
  | "TEMP_MAX"
  | "PRECIPITATION"
  | "WIND"
  | "SNOW";

const views: Views<ViewName, DimensionName> = new Map();

views.set("COUNT", {
  title: "Days selected",
  type: "0D",
  el: createElement("count")
});
views.set("ELEVATION", {
  title: "Elevation",
  type: "1D",
  el: createElement("elevation"),
  dimension: {
    name: "ELEVATION",
    bins: 25,
    extent: [-100, 3000],
    format: "d"
  }
});
views.set("TEMP_MIN", {
  title: "Minimum Temperature",
  type: "1D",
  el: createElement("tempmin"),
  dimension: {
    name: "TEMP_MIN",
    bins: 25,
    extent: [-10, 50],
    format: "d"
  }
});
views.set("TEMP_MAX", {
  title: "Maximum Temperature",
  type: "1D",
  el: createElement("tempmax"),
  dimension: {
    name: "TEMP_MAX",
    bins: 25,
    extent: [-10, 50],
    format: "d"
  }
});
views.set("PRECIPITATION", {
  title: "Precipitation in Millimeter",
  type: "1D",
  el: createElement("precipitation"),
  dimension: {
    name: "PRECIPITATION",
    bins: 25,
    extent: [0, 12],
    format: ".1f"
  }
});
views.set("WIND", {
  title: "Wind Speed in Meters per Second",
  type: "1D",
  el: createElement("wind"),
  dimension: {
    name: "WIND",
    bins: 25,
    extent: [0, 12],
    format: ".1f"
  }
});
views.set("SNOW", {
  title: "Snow Depth in Millimeter",
  type: "1D",
  el: createElement("snow"),
  dimension: {
    name: "SNOW",
    bins: 25,
    extent: [0, 1400],
    format: ".1f"
  }
});

const db = new ArrowDB(require("../data/weather-10m.arrow"));

async function dbBenchmark() {
  await db.initialize();

  for (const [_name, view] of views) {
    if (view.type === "1D") {
      const binConfig = bin(view.dimension.bins, view.dimension.extent!);
      view.dimension.binConfig = binConfig;
    } else if (view.type === "2D") {
      for (const dimension of view.dimensions) {
        const binConfig = bin(dimension.bins, dimension.extent!);
        dimension.binConfig = binConfig;
      }
    }
  }

  // warmup
  for (const [name, view] of views) {
    if (view.type === "1D") {
      db.loadData1D(view, 200, omit(views, name), new Map()).values();
    } else if (view.type === "2D") {
      db.loadData2D(view, [30, 30], omit(views, name), new Map()).values();
    }
  }

  function print(timings: number[]) {
    timings.sort((a, b) => a - b);

    console.log("Mean", mean(timings));
    console.log("Median", quantile(timings, 0.5));
    console.log("95 quantile", quantile(timings, 0.95));

    console.log();
    console.log("90 quantile", quantile(timings, 0.9));
    console.log("Stdev", Math.sqrt(variance(timings)!));
    console.log("Min", timings[0]);
    console.log("Max", timings[timings.length - 1]);
  }

  //*
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
        db.loadData1D(view, oneDres, omit(views, name), new Map());
      } else if (view.type === "2D") {
        db.loadData2D(view, twoDres, omit(views, name), new Map());
      } else {
        continue;
      }

      timings.push(performance.now() - time);
    }
  }

  console.log("Timings");
  print(timings);

  /*/
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

  print(timings);

  //*/
}

window.setTimeout(dbBenchmark, 1000);

// new App(views, db, {
//   cb: () => (document.getElementById("loading")!.style.display = "none")
// });
