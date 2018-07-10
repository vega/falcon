import { Table } from "@apache-arrow/es2015-esm";
import { App } from "../src/app";
import { LOGGING } from "../src/config";
import { DataBase } from "../src/db";
import { Logger } from "../src/logger";

fetch(require("../data/weather-10k.arrow")).then(response => {
  response.arrayBuffer().then(buffer => {
    const table = Table.from(new Uint8Array(buffer));

    type ViewName =
      | "ELEVATION"
      | "TEMP_MIN"
      | "TEMP_MAX"
      | "PRECIPITATION"
      | "WIND"
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
      el: document.getElementById("count")
    });
    views.set("ELEVATION", {
      title: "Elevation",
      type: "1D",
      el: document.getElementById("elevation"),
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
      el: document.getElementById("tempmin"),
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
      el: document.getElementById("tempmax"),
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
      el: document.getElementById("precipitation"),
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
      el: document.getElementById("wind"),
      dimension: {
        name: "WIND",
        bins: 25,
        extent: [0, 12],
        format: ".1f"
      }
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
