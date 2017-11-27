import * as d3 from 'd3';
import {readFileSync} from 'fs';
import * as config from '../shared/config';

// Like d3.time.format, but faster.
function parseDate(d) {
  return new Date(2001,
    d.substring(0, 2) - 1,
    d.substring(2, 4),
    d.substring(4, 6),
    d.substring(6, 8));
}

export default class Flights implements Backend {
  private flights: Array<{index: number, date: Date, delay: number, distance: number}>;

  constructor() {
    const data = readFileSync('data/flights-3m.csv', 'utf8');

    this.flights = d3.csvParse(data) as any;

    // A little coercion, since the CSV is untyped.
    this.flights.forEach((d: any, i) => {
      d.index = i;
      d.date = parseDate(d.date);
      d.delay = +d.delay;
      d.distance = +d.distance;
    });

    console.log(`${this.flights.length} flights initialized`);
  }

  public async query(queryConfig: QueryConfig): Promise<ResultData> {
    const data: ResultData = {};

    queryConfig.views.forEach(view => {
      if (view.type === '1D') {
        // TODO
      } else {
        // TODO
      }
    });

    const results = new Promise<ResultData>((resolve, reject) => {
      resolve(data);
    });

    return results;
  }
}
