import * as config from '../config';
import { SimpleCache } from '../client/cache/simple';

declare type Callback = (query: QueryConfig, results: ResultData) => void;

/**
 * Returns an iterator over the space in a grid of size distances.
 *
 * Need to provide the initia positions, the grid size, and the maximum range.
 */
export function* new1DIterator(indexes: Point1D[], subdivisions: number, maxRes: number, range: number): IterableIterator<Point1D> {
  // cycle through seeds
  let which = 0;

  // make distance so that we can easily subdivide it
  let dist = Math.pow(2, subdivisions);

  // pairs of index value and direction
  const indexSeeds: [Point1D, Point1D][] = [];

  // where should we sample
  const seeds: {[key: number]: boolean} = {};

  const returned: {[key: number]: boolean} = {};

  do {
    indexes.forEach(i => {
      // snap
      const idx = Math.round(i / dist) * dist;

      // only add if we don't already have a seed for this
      function add(ii: Point1D, d: Point1D) {
        if (!seeds[ii]) {
          indexSeeds.push([ii, d]);
          seeds[ii] = true;
        }
      }

      add(idx, dist);
      add(idx - dist, -dist);
    });

    while (indexSeeds.length) {
      which %= indexSeeds.length;

      const ret = indexSeeds[which][0];

      if (ret < 0 || range < ret) {
        indexSeeds.splice(which, 1);
        continue;
      }

      if (!(ret in returned)) {
        returned[ret] = true;
        yield ret;
      }

      // move new index value
      indexSeeds[which][0] += indexSeeds[which][1];

      // the next seed
      which++;
    }

    // double the resolution and start again
    dist /= 2;
  } while (dist >= maxRes);
};

export function* new2DIterator(indexes: Point2D[], subdivisions: number, maxRes: number, range: [number, number]): IterableIterator<Point2D> {
  let which = 0;

  let dist = Math.pow(2, subdivisions);

  const indexSeeds: [Point2D, Point2D][] = [];
  const seeds: {[key: string]: boolean} = {};

  const returned: {[key: string]: boolean} = {};

  do {
    indexes.forEach(i => {
      // snap
      const x = Math.round(i[0] / dist) * dist;
      const y = Math.round(i[1] / dist) * dist;

      // only add if we don't already have a seed for this
      function add(ii: Point2D, d: Point2D) {
        const key = `${ii[0]}_${ii[1]}`;
        if (!seeds[key]) {
          indexSeeds.push([ii, d]);
          seeds[key] = true;
        }
      }

      // go into 4 directions
      add([x, y], [dist, 0]);
      add([x - dist, y], [-dist, 0]);
      add([x, y - dist], [0, -dist]);
      add([x, y + dist], [0, dist]);
    });

    while (indexSeeds.length > 0) {
      which %= indexSeeds.length;

      const [x, y] = indexSeeds[which][0];

      if (x < 0 || range[0] < x || y < 0 || range[1] < y) {
        indexSeeds.splice(which, 1);
        continue;
      }

      const key = `${x}_${y}`;
      if (!(key in returned)) {
        returned[key] = true;
        yield [x, y];
      }

      // move new index value
      const [dxx, dyy] = indexSeeds[which][1];
      indexSeeds[which][0][0] += dxx;
      indexSeeds[which][0][1] += dyy;

      // the next seed
      which++;
    };

    // double the resolution and start again
    dist /= 2;
  } while (dist >= maxRes);
}

/**
 * Compute keys for the view, range, brush configuration. Does not include the index value and brush configuration as they are indexed separately.
 */
export function getKeys(query: Load | Preload | QueryConfig) {
  // active view
  const active = `${query.activeView && query.activeView.name}`;

  // brushes are in all views
  const brushes = query.views.map(v => {
    if (v.type === '1D') {
      if (v.brush) {
        return [v.name, `${v.name}:${v.brush}`];
      }
    } else {
      if (v.brushes) {
        return [v.name, `${v.name}:${v.brushes}`];
      }
    }
    return null;
  }).filter(v => v) as [string, string][];

  const keys: {[key: string]: string} = {};
  query.views.filter(v => v.query).forEach(v => {
    const br = brushes.filter(b => b[0] !== v.name).map(b => b[1]).join(' ');
    if (v.type === '1D') {
      keys[v.name] = `${v.name} ${active} ${v.range} ${br}`;
    } else {
      keys[v.name] = `${v.name} ${active} ${v.ranges} ${br}`;
    };
  });

  return keys;
}

// This is responsible for keeping the priority queue,
// rate limiting requests, and watching the cache.
class Session {
  private queryCount: number = 0;
  private closed: boolean = false;
  private hasUserInteracted: boolean = false;
  private sizes: Sizes = {};
  private _onQuery: Callback;

  private _preload?: Preload;
  private _preloadKeys: {[view: string]: string};
  private nextIndex: IterableIterator<Point>;

  private cache: SimpleCache;

  constructor(public readonly backend: Backend) { }

  // Set the sizes of the charts and initialize the session.
  public init(request: Init) {
    this.sizes = request.sizes;
    this.cache = new SimpleCache();

    if (config.optimizations.loadOnInit) {
      // load data for everything except the first view with the first view being active
      const first = config.views[0];
      const load: QueryConfig = {
        index: first.type === '1D' ? first.range[1] : [first.ranges[0][1], first.ranges[1][1]],
        activeView: first,
        views: config.views.slice(1).map(v => {
          return {...v, query: true};
        }),
        cacheKeys: {}  // tmp
      };
      load.cacheKeys = getKeys(load);
      this.query(load);

      // load data for the first view, making the second one active
      const second = config.views[1];
      const activeLoad: QueryConfig = {
        index: second.type === '1D' ? second.range[1] : [second.ranges[0][1], second.ranges[1][1]],
        activeView: second,
        views: [{...first, query: true}],
        cacheKeys: {}  // tmp
      };
      activeLoad.cacheKeys = getKeys(activeLoad);
      this.query(activeLoad);
    }
  }

  public onQuery(cb: Callback) {
    this._onQuery = cb;
  }

  public preload(request: Preload) {
    this._preload = request;
    this._preloadKeys = getKeys(request);

    const subdivisions = config.optimizations.preloadSubdivisions;
    const maxRes = config.optimizations.maxResolution;

    if (request.activeView.type === '1D') {
      const width = this.sizes[request.activeView.name] as number;
      this.nextIndex = new1DIterator(request.indexes as Point1D[], subdivisions, maxRes, width);

      console.log('Create new 1D preload iterator', request.indexes);
    } else {
      const dimensions = this.sizes[request.activeView.name] as [number, number];
      this.nextIndex = new2DIterator(request.indexes as Point2D[], subdivisions, maxRes, dimensions);

      console.log('Create new 2D preload iterator', request.indexes);
    }

    this.nextQuery();
  }

  private query(query: QueryConfig) {
    // check for cached results
    const results: ResultData = {};
    query.views.filter(v => v.query).forEach((v, i) => {
      const hit = this.cache.get((query.cacheKeys|| {})[v.name], query.index);
      console.log(`hit for ${(query.cacheKeys|| {})[v.name]}`);
      if (hit) {
        results[v.name] = hit;

        // no need to query any more since we can already send the results
        query.views[i].query = false;
      }
    });

    const l = Object.keys(results).length;
    if (config.optimizations.sendCached && l) {
      console.log(`Sending cached result with ${l} entries`);
      if (this._onQuery) {
        this._onQuery(query, results);
      }
    }

    this.queryCount += query.views.filter(v => v.query).length;

    if (query.views.filter(v => v.query).length > 0) {
      this.backend
        .query(query)
        .then(this.handleQuery(query))
        .catch(console.error);
    } else {
      this.nextQuery();
    }
  }

  // Load a particular value immediately.
  public load(request: Load) {
    this.query({
      ...request,
      cacheKeys: getKeys(request)
    });

    this.hasUserInteracted = true;
  }

  private nextQuery() {
    if (this._preload === undefined) {
      console.log('Nothing to preload');
      return;
    }

    const {value, done} = this.nextIndex.next();
    if (done) {
      console.log('Nothing left to preload');
      this._preload = undefined;
      return;
    }

    const av = this._preload.activeView;

    let indexValue = value;
    // translate back from pixel domain to data domain
    if (av.type === '1D') {
      indexValue = av.range[0] + (av.range[1] - av.range[0]) / (this.sizes[av.name] as number) * (indexValue as number);
    } else {
      const v = indexValue as Point2D;
      const size = this.sizes[av.name] as [number, number];
      indexValue = [
        av.ranges[0][0] + (av.ranges[0][1] - av.ranges[0][0]) / size[0] * v[0],
        av.ranges[1][0] + (av.ranges[1][1] - av.ranges[1][0]) / size[1] * v[1]
      ];
    }

    this.query({
      index: indexValue,
      activeView: this._preload.activeView,
      views: this._preload.views,
      cacheKeys: this._preloadKeys
    });
  }

  private handleQuery(query: QueryConfig) {
    return (results: ResultData) => {
      if (this.closed) {
        console.warn('Session closed.');
        this._preload = undefined;
        return;
      }

      this.queryCount -= Object.keys(results).length;

      // add new query results to cache
      query.views.filter(v => v.query).forEach(v => {
        this.cache.set((query.cacheKeys|| {})[v.name], query.index, results[v.name]);
      });

      if (config.optimizations.preload && this.queryCount < config.database.max_connections) {
        this.nextQuery();
      }

      if (this._onQuery) {
        this._onQuery(query, results);
      }
    };
  }

  public close() {
    this.closed = true;
  }
}


export default Session;
