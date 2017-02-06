import * as PriorityQueue from 'js-priority-queue';
import * as utils from '../utils';

import * as config from '../config';

interface QueueElement {
  index: number;
  value: number;
};

declare type Callback = (dimension: string, value: number, brushes: Brushes, results: ResultData) => void;

// This is responsible for keeping the priority queue,
// rate limiting requests, and watching the cache.
class Session {

  private queue: PriorityQueue<QueueElement>;
  private queryCount: number = 0;
  private closed: boolean = false;
  private hasUserInteracted: boolean = false;
  private _onQuery: Callback;

  constructor(public backend: Backend, public dimensions: Dimension[]) {
  }

  private getQueryConfiguration(activeDimension: string, value: number, dimensions: DimensionRanges, brushes: Brushes): QueryConfig {
    const conf: QueryConfig = {};

    // upper limit for active dimension
    conf[activeDimension] = {
      query: false,
      upper: value
    };

    // dimensions we are going to query
    utils.objectMap(dimensions, (range: Interval, k) => {
      conf[k] = {
        query: true,
        bins: config.dimensionIndex[k].bins,
        range: range
      };
    });

    // all other dimensions for which we may only need the range
    config.dimensions.filter(dim => dim.name !== activeDimension && !(dim.name in conf)).forEach(dim => {
      let pred: BrushRange = {
        query: false,
      };
      const range = brushes[dim.name];
      if (range) {
        pred.lower = range[0];
        pred.upper = range[0];
      }
      conf[dim.name] = pred;
    });

    return conf;
  }

  // Return the initial queries back to the client
  public init() {
    this.queue = new PriorityQueue<QueueElement>({
      initialValues: [],
      comparator: (a: QueueElement, b: QueueElement) => {
        return a.value - b.value;
      }
    });
  }

  public onQuery(cb: Callback) {
    this._onQuery = cb;
  }

  public preload(request: Preload) {
    // TODO
  }

  // Load a particular value immediately.
  public load(request: Load) {
    const predicates = this.getQueryConfiguration(request.activeDimension, request.index, request.dimensions, request.brushes);

    this.backend
      .query(predicates)
      .then(this.handleQuery(request.activeDimension, request.index, request.brushes))
      .catch(console.error);

    this.hasUserInteracted = true;
  }

  private nextQuery() {
    // TODO
  }

  private handleQuery(activeDimension: string, value: number, brushes: Brushes) {
    return (results: ResultData) => {
      if (this.closed) {
        return;
      }

      this.queryCount--;
      if ((config.optimizations.startOnPageload || this.hasUserInteracted) && config.optimizations.preload && this.queryCount < config.database.max_connections - (this.dimensions.length - 1)) {
        this.nextQuery();
      }

      if (this._onQuery) {
        this._onQuery(activeDimension, value, brushes, results);
      }
    };
  }

  public close() {
    this.closed = true;
  }
}


export default Session;
