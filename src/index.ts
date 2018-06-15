import { Table } from "@apache-arrow/es2015-esm";
import { select } from "d3";
import { App } from "./app";
import { DataBase } from "./db";
import { is1DView } from "./util";

fetch(require("../data/flights-10k.arrow")).then(response => {
  response.arrayBuffer().then(buffer => {
    const table = Table.from(new Uint8Array(buffer));
    const data = new Map<DimensionName, DataArray>();
    for (const field of table.schema.fields) {
      data.set(
        field.name as DimensionName,
        table
          .getColumn(field.name)!
          // .slice(0, 100)
          .toArray() as DataArray
      );
    }

    type ViewName =
      | "ARR_DELAY"
      | "DISTANCE"
      | "DEP_DELAY"
      | "DEP_DELAY_ARR_DELAY";
    type DimensionName = "ARR_DELAY" | "DISTANCE" | "DEP_DELAY";

    const order: ViewName[] = [
      "ARR_DELAY",
      "DISTANCE",
      "DEP_DELAY",
      "DEP_DELAY_ARR_DELAY"
    ];

    const views: Views<ViewName, DimensionName> = new Map();
    views.set("ARR_DELAY", {
      bins: 25,
      dimension: "ARR_DELAY",
      extent: [-10, 100],
      title: "Arrival Delay",
      type: "1D"
    });
    views.set("DISTANCE", {
      bins: 25,
      dimension: "DISTANCE",
      extent: [50, 2000],
      title: "Distance",
      type: "1D"
    });
    views.set("DEP_DELAY", {
      bins: 25,
      dimension: "DEP_DELAY",
      extent: [-10, 100],
      title: "Departure Delay",
      type: "1D"
    });
    views.set("DEP_DELAY_ARR_DELAY", {
      bins: [25, 25],
      dimensions: ["DEP_DELAY", "ARR_DELAY"],
      domains: [[-10, 100], [-10, 100]],
      title: "Delay Matrix",
      type: "2D"
    });

    const dimensions = new Set<DimensionName>();
    for (const v of views.values()) {
      if (is1DView(v)) {
        dimensions.add(v.dimension);
      } else {
        dimensions.add(v.dimensions[0]);
        dimensions.add(v.dimensions[1]);
      }
    }

    const db = new DataBase(data, table, dimensions);

    const el = select("#app");

    // add for now to clear the view
    (el.node() as any).innerHTML = "";

    new App(el, views, order, db);
  });
});

// const data = require("../data/flights-10k.json");

// data.AIR_TIME = new Int16Array(data.AIR_TIME);
// data.ARR_DELAY = new Int16Array(data.ARR_DELAY);
// data.DEP_DELAY = new Int16Array(data.DEP_DELAY);
// data.DISTANCE = new Int16Array(data.DISTANCE);
// data.ARRIVAL = data.ARRIVAL.map(d => new Date(d * 1000));
// data.DEPARTURE = data.DEPARTURE.map(d => new Date(d * 1000));
