import { App, ArrowDB, Views } from "../src";
import { createElement } from "../flights/utils";

document.getElementById("app")!.innerText = "";

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

const db = new ArrowDB(require("../data/weather-10k.arrow"));

new App(views, db, {
  cb: () => (document.getElementById("loading")!.style.display = "none")
});
