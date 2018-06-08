import { app } from "./app";

const data = require("../data/flights-10k.json");

data.AIR_TIME = new Int16Array(data.AIR_TIME);
data.ARR_DELAY = new Int16Array(data.ARR_DELAY);
data.DEP_DELAY = new Int16Array(data.DEP_DELAY);
data.DISTANCE = new Int16Array(data.DISTANCE);
data.ARRIVAL = data.ARRIVAL.map(d => new Date(d * 1000));
data.DEPARTURE = data.DEPARTURE.map(d => new Date(d * 1000));

app(data);
