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

export default class Flights {
  private flights: FlightData;

  constructor() {
    const data = readFileSync('data/flights-200k.csv', 'utf8');

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

  public load(request: Init, sizes: Sizes): ResultSlice {
    const data: ResultSlice = {};
    const flights = this.filterFlights(request.views);

    for (const view of request.views) {
      const step = stepSize(view.range, view.bins);
      const bins = d3.range(view.range[0], view.range[1] + step, step);
      const hist = d3.histogram()
        .domain(view.range)
        .thresholds(bins)(flights.map(d => d[view.name]))
        .map(d => d.length);

      data[view.name] = hist;
    }

    return data;
  }

  public loadAll(request: Load, sizes: Sizes): ResultCube {
    const data: ResultCube = {};

    const flights = this.filterFlights(request.views.concat([request.activeView]));

    const activeView = request.activeView;

    flights.sort((a, b) => a[activeView.name] - b[activeView.name]);

    const binActive = binningFunc(activeView.range, sizes[request.activeView.name] / config.optimizations.maxResolution);

    for (const view of request.views) {
      data[view.name] = [];

      const bin = binningFunc(view.range, view.bins);
      let activeBucket;  // what bucket in the active dimension are we at
      let hist: number[] = new Array(view.bins);
      for (let i = 0; i < hist.length; i++) { hist[i] = 0; }

      for (const d of flights) {
        const newActiveBucket = binActive(d[activeView.name]);

        if (activeBucket !== newActiveBucket) {
          activeBucket = newActiveBucket;
          hist = hist.slice();
          data[view.name][activeBucket] = hist;
        }

        // filter by the other views
        let filtered = false;
        for (const otherView of request.views) {
          if (otherView.name !== view.name && otherView.brush) {
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
    }

    return data;
  }

  private filterFlights(views: View[]) {
    // Only look at flights that are within the visible boundaries.
    // The semantics of crossfilter are not all that obvious.
    return this.flights.filter(d => {
      for (const view of views) {
        if (d[view.name] < view.range[0] || view.range[1] <= d[view.name]) {
          return false;
        }
      }
      return true;
    });
  }
}
