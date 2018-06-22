import { Table } from "@apache-arrow/es2015-esm";
import { select } from "d3";
import { App } from "./app";
import { DataBase } from "./db";

// import "./mapd";

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

    // convert departure time to number
    data.set(
      "DEP_TIME",
      (data.get("DEP_TIME") as any).map(d => Math.floor(d / 100)) // + (d % 100) / 60
    );
    data.set(
      "ARR_TIME",
      (data.get("ARR_TIME") as any).map(d => Math.floor(d / 100))
    );

    type ViewName =
      | "DISTANCE"
      | "DEP_TIME"
      | "ARR_TIME"
      | "AIR_TIME"
      | "DEP_DELAY_ARR_DELAY";
    type DimensionName =
      | "ARR_DELAY"
      | "ARR_TIME"
      | "DISTANCE"
      | "DEP_DELAY"
      | "DEP_TIME"
      | "AIR_TIME"
      | "DEPARTURE"
      | "DEP_TIME";

    const order: ViewName[] = [
      "DEP_TIME",
      "ARR_TIME",
      "DISTANCE",
      "AIR_TIME",
      "DEP_DELAY_ARR_DELAY"
    ];

    const views: Views<ViewName, DimensionName> = new Map();
    views.set("DISTANCE", {
      title: "Distance",
      type: "1D",
      dimension: {
        name: "DISTANCE",
        bins: 25,
        extent: [0, 4000]
      }
    });
    views.set("ARR_TIME", {
      title: "Arrival Time",
      type: "1D",
      dimension: {
        name: "ARR_TIME",
        bins: 24,
        extent: [0, 24]
      }
    });
    views.set("DEP_TIME", {
      title: "Departure Time",
      type: "1D",
      dimension: {
        name: "DEP_TIME",
        bins: 24,
        extent: [0, 24]
      }
    });
    views.set("AIR_TIME", {
      title: "Departure Delay",
      type: "1D",
      dimension: {
        name: "AIR_TIME",
        bins: 25,
        extent: [0, 500]
      }
    });
    views.set("DEP_DELAY_ARR_DELAY", {
      title: "Delay Matrix",
      type: "2D",
      dimensions: [
        {
          name: "DEP_DELAY",
          bins: 25,
          extent: [-20, 60]
        },
        {
          name: "ARR_DELAY",
          bins: 25,
          extent: [-20, 60]
        }
      ]
    });

    const db = new DataBase(data);

    const el = select("#app");

    // add for now to clear the view
    (el.node() as any).innerHTML = "";

    // const logger = new Logger();
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
