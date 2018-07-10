import { Table } from "@apache-arrow/es2015-esm";
import { App } from "../src/app";
import { LOGGING } from "../src/config";
import { DataBase } from "../src/db";
import { Logger } from "../src/logger";

document.getElementById("app")!.innerText = "";

function createElement(id: string) {
  const el = document.createElement("div");
  el.setAttribute("id", id);
  document.getElementById("app")!.appendChild(el);
  return el;
}

fetch(require("../data/movies.arrow")).then(response => {
  response.arrayBuffer().then(buffer => {
    const table = Table.from(new Uint8Array(buffer));

    type ViewName =
      | "COUNT"
      | "IMDB_Rating"
      | "IMDB_Votes"
      | "Rotten_Tomatoes_Rating"
      | "Production_Budget"
      | "Running_Time_min"
      | "Release_Date"
      | "US_DVD_Sales"
      | "US_Gross"
      | "Worldwide_Gross";

    type DimensionName =
      | "IMDB_Rating"
      | "IMDB_Votes"
      | "Rotten_Tomatoes_Rating"
      | "Production_Budget"
      | "Running_Time_min"
      | "Release_Date"
      | "US_DVD_Sales"
      | "US_Gross"
      | "Worldwide_Gross";

    const views: Views<ViewName, DimensionName> = new Map();

    views.set("COUNT", {
      title: "Movies selected",
      type: "0D",
      el: createElement("count")
    });
    views.set("IMDB_Rating", {
      title: "IMDB Rating",
      type: "1D",
      el: createElement("imdb"),
      dimension: {
        name: "IMDB_Rating",
        bins: 25,
        extent: [0, 10],
        format: ".2f"
      }
    });
    views.set("Rotten_Tomatoes_Rating", {
      title: "Rotten Tomatoes Rating",
      type: "1D",
      el: createElement("tomatoes"),
      dimension: {
        name: "Rotten_Tomatoes_Rating",
        bins: 25,
        extent: [0, 100],
        format: "d"
      }
    });
    views.set("Production_Budget", {
      title: "Production Budget",
      type: "1D",
      el: createElement("budget"),
      dimension: {
        name: "Production_Budget",
        bins: 25,
        extent: [0, 300000000],
        format: "d"
      }
    });
    views.set("Running_Time_min", {
      title: "Running Time in Minutes",
      type: "1D",
      el: createElement("runningtime"),
      dimension: {
        name: "Running_Time_min",
        bins: 25,
        extent: [0, 260],
        format: "d"
      }
    });
    views.set("US_DVD_Sales", {
      title: "DVD Sales",
      type: "1D",
      el: createElement("dvdsales"),
      dimension: {
        name: "US_DVD_Sales",
        bins: 25,
        extent: [0, 400000000],
        format: "d"
      }
    });
    views.set("US_Gross", {
      title: "US Gross",
      type: "1D",
      el: createElement("usgross"),
      dimension: {
        name: "US_Gross",
        bins: 25,
        extent: [0, 600000000],
        format: "d"
      }
    });
    views.set("Worldwide_Gross", {
      title: "Worldwide Gross",
      type: "1D",
      el: createElement("gross"),
      dimension: {
        name: "Worldwide_Gross",
        bins: 25,
        extent: [0, 1200000000],
        format: "d"
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
