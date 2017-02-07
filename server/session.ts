import * as PriorityQueue from 'js-priority-queue';

import * as config from '../config';

interface QueueElement {
  index: number;
  value: number;
};

declare type Callback = (request: Init | Preload | Load, results: ResultData) => void;

// This is responsible for keeping the priority queue,
// rate limiting requests, and watching the cache.
class Session {

  private queue: PriorityQueue<QueueElement>;
  private queryCount: number = 0;
  private closed: boolean = false;
  private hasUserInteracted: boolean = false;
  private _onQuery: Callback;

  constructor(public backend: Backend, public dimensions: View[]) {
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
    const queryConfig: QueryConfig = {
      activeView: request.activeView,
      index: request.index,
      views: request.views
    };

    this.backend
      .query(queryConfig)
      .then(this.handleQuery(request))
      .catch(console.error);

    this.hasUserInteracted = true;
  }

  private nextQuery() {
    // TODO
  }

  private handleQuery(request: Load | Preload) {
    return (results: ResultData) => {
      if (this.closed) {
        return;
      }

      this.queryCount--;
      if ((config.optimizations.startOnPageload || this.hasUserInteracted) && config.optimizations.preload && this.queryCount < config.database.max_connections - (this.dimensions.length - 1)) {
        this.nextQuery();
      }

      if (this._onQuery) {
        this._onQuery(request, results);
      }
    };
  }

  public close() {
    this.closed = true;
  }
}


export default Session;
