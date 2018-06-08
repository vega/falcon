import { App } from "./app";
import { select } from "d3";

const data = require("../data/flights-10k.json");

data.AIR_TIME = new Int16Array(data.AIR_TIME);
data.ARR_DELAY = new Int16Array(data.ARR_DELAY);
data.DEP_DELAY = new Int16Array(data.DEP_DELAY);
data.DISTANCE = new Int16Array(data.DISTANCE);
data.ARRIVAL = data.ARRIVAL.map(d => new Date(d * 1000));
data.DEPARTURE = data.DEPARTURE.map(d => new Date(d * 1000));

const VIEWS: View[] = [
  {
    bins: 25,
    dimension: "ARR_DELAY",
    name: "ARR_DELAY",
    range: [-10, 100],
    title: "Arrival Delay",
    type: "1D"
  },
  {
    bins: 25,
    dimension: "DISTANCE",
    name: "DISTANCE",
    range: [50, 2000],
    title: "Distance",
    type: "1D"
  },
  {
    bins: 25,
    dimension: "DEP_DELAY",
    name: "DEP_DELAY",
    range: [-10, 100],
    title: "Departure Delay",
    type: "1D"
  }
];

const el = select("#app");

// add for now to clear the view
(el.node() as any).innerHTML = "";

new App(el, VIEWS, data);
