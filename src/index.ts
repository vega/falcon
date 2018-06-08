import { csv } from "d3";
import { DATA_FILE } from "./data";
import { app } from "./app";

csv(DATA_FILE).then(data => {
  app(data);
});
