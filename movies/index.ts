import { Table } from "@apache-arrow/es2015-esm";
import { App } from "../src/app";
import { LOGGING } from "../src/config";
import { DataBase } from "../src/db";
import { Logger } from "../src/logger";

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
      el: document.getElementById("count")
    });
    views.set("IMDB_Rating", {
      title: "IMDB Rating",
      type: "1D",
      el: document.getElementById("imdb"),
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
      el: document.getElementById("tomatoes"),
      dimension: {
        name: "Rotten_Tomatoes_Rating",
        bins: 25,
        extent: [0, 100],
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
