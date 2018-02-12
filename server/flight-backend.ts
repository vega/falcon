import * as d3 from 'd3';
import { range } from 'd3-array';
import {readFileSync} from 'fs';
import * as config from '../shared/config';
import { binningFunc, is1DView, stepSize } from '../shared/util';

// Like d3.time.format, but faster.
function parseDate(d) {
  return new Date(d.substring(0, 4),
    d.substring(4, 6) - 1,
    d.substring(6, 8),
    d.substring(8, 10),
    d.substring(10, 12));
}

type FlightData = Array<{index: number, date: Date, delay: number, distance: number}>;

export default class Flights implements Backend {
  private flights: FlightData;

  private activeView: View1D;

  private cache: {[view: string]: {[index: number]: number[]}};

  constructor() {
    const data = readFileSync('data/flights-10k.csv', 'utf8');

    this.flights = d3.csvParse(data) as any;

    // A little coercion, since the CSV is untyped.
    this.flights.forEach((d: any, i) => {
      d.DEPARTURE = parseDate(d.FL_DATE + d.DEP_TIME);
      d.ARRIVAL = parseDate(d.FL_DATE + d.ARR_TIME);
      d.ARR_DELAY = +d.ARR_DELAY;
      d.DEP_DELAY = +d.DEP_DELAY;
      d.DISTANCE = +d.DISTANCE;
    });

    console.info(`${this.flights.length} flights initialized`);
  }

  public async query(queryConfig: QueryConfig): Promise<ResultData> {
    const data: ResultData = {};

    // Only look at flights that are within the visible boundaries.
    // The semantics of crossfilter are not all that obvious.
    const flights = this.flights.filter(d => {
      for (const view of queryConfig.views.filter(v => v.type === '1D') as View1D[]) {
        if (d[view.name] < view.range[0] || view.range[1] <= d[view.name]) {
          return false;
        }
      }
      return true;
    });

    if (queryConfig.activeView) {
      if (queryConfig.activeView.name !== (this.activeView && this.activeView.name)) {
        this.switchActiveView(queryConfig, flights);
      }

      const binActive = binningFunc(this.activeView.range, queryConfig.size as number);
      const index = binActive(queryConfig.index as number);

      for (const view of queryConfig.views) {
        if (view.type === '1D') {
          data[view.name] = this.cache[view.name][index];
        } else {
          // TODO
        }
      }
    } else {
      for (const view of queryConfig.views) {
        if (view.type === '1D') {
          const step = stepSize(view.range, view.bins);
          const bins = d3.range(view.range[0], view.range[1] + step, step);
          const hist = d3.histogram()
            .domain(view.range)
            .thresholds(bins)(flights.map(d => d[view.name]))
            .map(d => d.length);

          data[view.name] = hist;
        } else {
          // TODO
        }
      }
    }

    const results = new Promise<ResultData>((resolve, reject) => {
      resolve(data);
    });

    return results;
  }

  private switchActiveView(queryConfig: QueryConfig, flights: FlightData) {
    this.activeView = queryConfig.activeView as View1D;

    // reset the cache
    this.cache = {};

    flights.sort((a, b) => a[this.activeView.name] - b[this.activeView.name]);

    const binActive = binningFunc(this.activeView.range, queryConfig.size as number);

    for (const view of config.views.filter(v => v.name !== this.activeView.name)) {
      if (view.type === '1D') {
        this.cache[view.name] = {};

        const bin = binningFunc(view.range, view.bins);
        let activeBucket;  // what bucket in the active dimension are we at
        let hist: number[] = new Array(view.bins);
        for (let i = 0; i < hist.length; i++) { hist[i] = 0; }

        for (const d of flights) {
          const newActiveBucket = binActive(d[this.activeView.name]);

          if (activeBucket !== newActiveBucket) {
            activeBucket = newActiveBucket;
            hist = hist.slice();
            this.cache[view.name][activeBucket] = hist;
          }

          // filter by the other views
          let filtered = false;
          for (const otherView of queryConfig.views) {
            if (is1DView(otherView) && otherView.brush) {
              if (d[otherView.name] < otherView.brush[0] || otherView.brush[1] < d[otherView.name]) {
                filtered = true;
                break;
              }
            }
          }

          if (!filtered) {
            hist[bin(d[view.name])]++;
          }
        }
      } else {
        // TODO
      }
    }
  }
}
