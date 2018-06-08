import { csv } from "d3";
import { DATA_FILE } from "./data";
import { app } from "./app";

// Like d3.time.format, but faster.
function parseDate(d) {
  return new Date(
    d.substring(0, 4),
    d.substring(4, 6) - 1,
    d.substring(6, 8),
    d.substring(8, 10),
    d.substring(10, 12)
  );
}

csv(DATA_FILE, (d: any) => ({
  DEPARTURE: parseDate(d.FL_DATE + d.DEP_TIME),
  ARRIVAL: parseDate(d.FL_DATE + d.ARR_TIME),
  ARR_DELAY: +d.ARR_DELAY,
  DEP_DELAY: +d.DEP_DELAY,
  DISTANCE: +d.DISTANCE
})).then(data => {
  app(data);
});
