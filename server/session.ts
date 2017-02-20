import * as config from '../config';

declare type Callback = (request: Init | Preload | Load, results: ResultData) => void;

// This is responsible for keeping the priority queue,
// rate limiting requests, and watching the cache.
class Session {
  private queryCount: number = 0;
  private closed: boolean = false;
  private hasUserInteracted: boolean = false;
  private sizes: Sizes = {};
  private _onQuery: Callback;

  constructor(public backend: Backend, public dimensions: View[]) {
  }

  // Set the sizes of the charts and initialize the session.
  public init(request: Init) {
    this.sizes = request.sizes;

    // load data for everything except the first view with the first view being active
    const first = config.views[0];
    const load: Load = {
      type: 'load',
      index: first.type === '1D' ? first.range[1] : [first.ranges[0][1], first.ranges[1][1]],
      activeView: first.name,
      views: config.views.filter(v => v.name !== first.name).map(v => {
        return {...v, query: true};
      })
    };
    this.load(load);

    // load data for the first view, making the second one active
    const second = config.views[1];
    const activeLoad: Load = {
      type: 'load',
      index: second.type === '1D' ? second.range[1] : [second.ranges[0][1], second.ranges[1][1]],
      activeView: second.name,
      views: [{...first, query: true}]
    };
    this.load(activeLoad);
  }

  public onQuery(cb: Callback) {
    this._onQuery = cb;
  }

  public preload(request: Preload) {
    // TODO
    console.log(request);
  }

  // Load a particular value immediately.
  public load(request: Load) {
    this.backend
      .query(request)
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
        console.warn('Connection closed.');
        return;
      }

      this.queryCount--;
      if (config.optimizations.preload && this.queryCount < config.database.max_connections - (this.dimensions.length - 1)) {
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
