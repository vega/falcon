import { app } from "./app";

import data from "../data/flights-10k.json";

data.ARR_DELAY = new Int16Array(data.ARR_DELAY);
data.DEP_DELAY = new Int16Array(data.DEP_DELAY);
data.DISTANCE = new Int16Array(data.DISTANCE);

app(data);
