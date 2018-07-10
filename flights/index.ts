import { Table } from "@apache-arrow/es2015-esm";
import { App } from "../src/app";
import { LOGGING } from "../src/config";
import { DataBase } from "../src/db";
import { Logger } from "../src/logger";

// import "./mapd";

fetch(require("../data/flights-10k.arrow")).then(response => {
  response.arrayBuffer().then(buffer => {
    const table = Table.from(new Uint8Array(buffer));

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
      | "DEPARTURE"
      | "DEP_TIME";

    const views: Views<ViewName, DimensionName> = new Map();

    views.set("COUNT", {
      title: "Flights selected",
      type: "0D",
      el: document.getElementById("count")
    });
    views.set("DISTANCE", {
      title: "Distance in Miles",
      type: "1D",
      el: document.getElementById("distance"),
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
      el: document.getElementById("arrival"),
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
      el: document.getElementById("departure"),
      dimension: {
        name: "DEP_TIME",
        bins: 24,
        extent: [0, 24],
        format: ".1f"
      }
    });
    views.set("DEP_DELAY", {
      title: "Departure Delay in Minutes",
      type: "1D",
      el: document.getElementById("dep_delay"),
      dimension: {
        name: "DEP_DELAY",
        bins: 25,
        extent: [-20, 60],
        format: ".1f"
      }
    });
    views.set("ARR_DELAY", {
      title: "Arrival Delay in Minutes",
      type: "1D",
      el: document.getElementById("arr_delay"),
      dimension: {
        name: "ARR_DELAY",
        bins: 25,
        extent: [-20, 60],
        format: ".1f"
      }
    });
    views.set("AIR_TIME", {
      title: "Airtime in Minutes",
      type: "1D",
      el: document.getElementById("airtime"),
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
      el: document.getElementById("delay"),
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

    const db = new DataBase(table);

    document.getElementById("loading")!.innerText = "";

    let logger;
    if (LOGGING) {
      // logger = new Logger("u0", "t0", "http://localhost:5001/store-log");
      logger = new Logger(
        "" + Math.floor(Math.random() * 10000),
        "" + Math.floor(Math.random() * 10000),
        "//playfair.cs.washington.edu:5001/store-log"
      );
    }

    window.onbeforeunload = () =>
      logger.hasUnsentData()
        ? "We still need to send logs. Try again in a few seconds."
        : null;

    new App(views, db, logger);
  });
});
