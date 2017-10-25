import { scaleLinear } from 'd3';
import * as config from '../shared/config';
import { clamp } from '../shared/util';
import { SimpleCache } from './simple-cache';

declare type Callback = (query: QueryConfig, results: ResultData) => void;

/**
 * Returns an iterator over the space in a grid of size distances.
 *
 * Need to provide the initial positions, the grid size, and the maximum range.
 */
export function* new1DIterator(indexes: Point1D[], subdivisions: number, maxRes: number, range: number): IterableIterator<Point1D> {
  // cycle through seeds
  let which = 0;

  // make distance so that we can easily subdivide it
  let dist = Math.pow(2, subdivisions);

  // tuple of index value, direction, starting point
  const indexSeeds: Array<[Point1D, Point1D, Point1D]> = [];

  const returned: {[key: number]: boolean} = {};

  do {
    indexes.forEach(i => {
      // snap
      const idx = Math.round(i / dist) * dist;

      function add(ii: Point1D, d: Point1D, start: Point1D) {
        indexSeeds.push([ii + d, d, start]);
      }

      add(idx, dist, idx);
      add(idx, -dist, idx);
    });

    while (indexSeeds.length) {
      which %= indexSeeds.length;

      const idx = indexSeeds[which];
      const ret = idx[0];
      const d = Math.abs(idx[0] - idx[2]);

      // TODO: check that this rule makes sense
      if (ret < 0 || range < ret || (d > range / dist && dist > maxRes)) {
        indexSeeds.splice(which, 1);
        continue;
      }

      if (!(ret in returned)) {
        returned[ret] = true;
        yield ret;
      }

      // move new index value
      idx[0] += idx[1];

      // the next seed
      which++;
    }

    // double the resolution and start again
    dist /= 2;
  } while (dist >= maxRes);
}

export function* new2DIterator(indexes: Point2D[], subdivisions: number, maxRes: number, range: [number, number]): IterableIterator<Point2D> {
  let which = 0;

  let dist = Math.pow(2, subdivisions);

  const indexSeeds: Array<[Point2D, Point2D, boolean]> = [];

  const returned: {[key: string]: boolean} = {};

  // add seed but start translated
  function add(ii: Point2D, d: Point2D, seed: boolean) {
    const [x, y] = ii;
    if (0 <= x && x <= range[0] && 0 <= y && y <= range[1]) {
      indexSeeds.push([[x + d[0], y + d[1]], d, seed]);
    }
  }

  do {
    for (const idx of indexes) {
      // snap
      const x = Math.round(idx[0] / dist) * dist;
      const y = Math.round(idx[1] / dist) * dist;

      // yield the center
      yield [x, y];

      // go into 4 directions
      add([x, y], [dist, 0], true);
      add([x, y], [-dist, 0], true);
      add([x, y], [0, -dist], true);
      add([x, y], [0, dist], true);
    }

    while (indexSeeds.length > 0) {
      which %= indexSeeds.length;

      const idx = indexSeeds[which];
      let [x, y] = idx[0];

      const [dxx, dyy] = idx[1];

      if (idx[2]) {
        // spawn new seed (counter clockwise)
        if (dxx === dist && dyy === 0) {
          add([x, y], [0, dist], false);
        } else if (dxx === 0 && dyy === dist) {
          add([x, y], [-dist, 0], false);
        } else if (dxx === -dist && dyy === 0) {
          add([x, y], [0, -dist], false);
        } else if (dxx === 0 && dyy === -dist) {
          add([x, y], [dist, 0], false);
        } else {
          throw new Error('Invalid direction');
        }
      }

      const key = `${x}_${y}`;
      if (!(key in returned)) {
        returned[key] = true;
        yield [x, y];
      }

      // move index value
      x = idx[0][0] += dxx;
      y = idx[0][1] += dyy;

      // remove seeds that left the range
      if (x < 0 || range[0] < x || y < 0 || range[1] < y) {
        indexSeeds.splice(which, 1);
      } else {
        // the next seed
        which++;
      }
    }

    // double the resolution and start again
    dist /= 2;
  } while (dist >= maxRes);
}

/**
 * Compute keys for the view, range, brush configuration. Does not include the index value and brush configuration as they are indexed separately.
 */
export function getKeys(query: Load | Preload | QueryConfig) {
  // active view
  const active = `${query.activeViewName}`;

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
    // should never happen
    return '';
  }).filter(v => v);

  const keys: {[key: string]: string} = {};
  query.views.filter(v => v.query).forEach(v => {
    const br = brushes.filter(b => b[0] !== v.name).map(b => b[1]).join(' ');
    if (v.type === '1D') {
      keys[v.name] = `${v.name} ${active} ${v.range} ${br}`;
    } else {
      keys[v.name] = `${v.name} ${active} ${v.ranges} ${br}`;
    }
  });

  return keys;
}

// This is responsible for keeping the priority queue,
// rate limiting requests, and watching the cache.
class Session {
  private closed: boolean = false;
  private hasUserInteracted: boolean = false;
  private sizes: Sizes = {};
  private stats: Stats = {};

  private _onQuery: Callback;

  private cache: SimpleCache;

  // preloading
  private _preload?: Preload;
  private _preloadKeys: {[view: string]: string};
  private _nextIndex: IterableIterator<Point>;
  private _scaleWidth: d3.ScaleLinear<number, number>;
  private _scaleHeight: d3.ScaleLinear<number, number>;

  constructor(public readonly backend: Backend) { }

  // Set the sizes of the charts and initialize the session.
  public init(request: Init) {
    this.sizes = request.sizes;
    this.cache = new SimpleCache();

    if (config.optimizations.loadOnInit) {
      // load data for everything except the first view with the first view being active
      const first = config.views[0];
      const load: QueryConfig = {
        activeViewName: first.name,
        views: config.views.slice(1).map(v => {
          return {...v, query: true};
        }),
        cacheKeys: {},  // tmp
      };
      load.cacheKeys = getKeys(load);
      this.query(load);

      // load data for the first view, making the second one active
      const second = config.views[1];
      const activeLoad: QueryConfig = {
        activeViewName: second.name,
        views: [{...first, query: true}],
        cacheKeys: {},  // tmp
      };
      activeLoad.cacheKeys = getKeys(activeLoad);
      this.query(activeLoad);
    }
  }

  public profile(request: Profile) {
    this.stats = request.stats;
  }

  public onQuery(cb: Callback) {
    this._onQuery = cb;
  }

  public preload(request: Preload) {
    this._preload = request;
    this._preloadKeys = getKeys(request);

    const subdivisions = config.optimizations.preloadSubdivisions;
    const maxRes = config.optimizations.maxResolution;

    if (request.activeViewType === '1D') {
      this._scaleWidth = scaleLinear().domain(request.range).range([0, request.pixel]);

      // in pixel space already
      const vel = request.velocity;
      const acc = request.acceleration;
      const times = request.views.filter(v => v.query).map(v => (this.stats[v.name] || {}).median || config.optimizations.defaultRoundtripTime);
      const time = times.length ? times.reduce((p, c) => p + c) / times.length : config.optimizations.defaultRoundtripTime;
      const offset = vel * time + (acc * time * time) / 2;

      this._nextIndex = new1DIterator(request.indexes.map(i => clamp(this._scaleWidth(i) + offset, [0, request.pixel])), subdivisions, maxRes, request.pixel);

      console.info('Create new 1D preload iterator', request.indexes);
    } else {
      this._scaleWidth = scaleLinear().domain(request.ranges[0]).range([0, request.pixels[0]]);
      this._scaleHeight = scaleLinear().domain(request.ranges[1]).range([0, request.pixels[1]]);

      // TODO: use velocity and acceleration in 2D
      this._nextIndex = new2DIterator(
        request.indexes.map(i =>
          [this._scaleWidth(i[0]), this._scaleHeight(i[1])] as Point2D,
        ), subdivisions, maxRes, request.pixels);

      console.info('Create new 2D preload iterator', request.indexes);
    }

    this.nextQuery();
  }

  public close() {
    this.closed = true;
  }

  // Load a particular value immediately.
  public load(request: Load) {
    this.query({
      activeViewName: request.activeViewName,
      views: request.views,
      index: request.index,
      cacheKeys: getKeys(request),
    });

    this.hasUserInteracted = true;
  }

  private query(query: QueryConfig) {
    // check for cached results
    const results: ResultData = {};
    query.views.filter(v => v.query).forEach((v, i) => {
      const key = (query.cacheKeys || {})[v.name];
      const hit = this.cache.get(key, query.index);
      if (hit) {
        console.info(`hit for ${key}`);
        results[v.name] = hit;

        // no need to query any more since we can already send the results
        query.views[i].query = false;
      }
    });

    const l = Object.keys(results).length;
    if (config.optimizations.sendCached && l) {
      console.info(`Sending cached result with ${l} entries`);
      if (this._onQuery) {
        const q = Object.assign({}, query);
        delete q.cacheKeys;
        this._onQuery(q, results);
      }
    }

    if (query.views.filter(v => v.query).length > 0) {
      this.backend
        .query(query)
        .then(this.handleQuery(query))
        .catch(console.error);
    } else {
      this.nextQuery();
    }
  }

  private nextQuery() {
    if (this._preload === undefined) {
      return;
    }

    const {value, done} = this._nextIndex.next();
    if (done) {
      console.info('Nothing left to preload');
      this._preload = undefined;
      return;
    }

    const preload = this._preload;

    let indexValue = value;
    // translate back from pixel domain to data domain
    if (preload.activeViewType === '1D') {
      indexValue = this._scaleWidth.invert(indexValue as Point1D);
    } else {
      const v = indexValue as Point2D;
      indexValue = [this._scaleWidth.invert(v[0]), this._scaleHeight.invert(v[1])];
    }

    this.query({
      index: indexValue,
      ...this._preload,
      cacheKeys: this._preloadKeys,
    });
  }

  private handleQuery(query: QueryConfig) {
    return (results: ResultData) => {
      if (this.closed) {
        console.warn('Session closed.');
        this._preload = undefined;
        return;
      }

      // add new query results to cache
      query.views.filter(v => v.query).forEach(v => {
        this.cache.set((query.cacheKeys || {})[v.name], query.index, results[v.name]);
      });

      if (config.optimizations.preload) {
        this.nextQuery();
      }

      if (this._onQuery) {
        const q = Object.assign({}, query);
        delete q.cacheKeys;
        this._onQuery(q, results);
      }
    };
  }
}

export default Session;
