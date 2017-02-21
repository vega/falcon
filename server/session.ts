import {ascending} from 'd3-array';
import * as config from '../config';

declare type Callback = (query: QueryConfig, results: ResultData) => void;

/**
 * Returns an iterator over the space in a grid of size distances.
 *
 * Need to provide the initia positions, the grid size, and the maximum range.
 */
export function new1DIterator(indexes: Point1D[], distance: Point1D, range: Interval<Point1D>) {
  let which = 0;

  const returned: {[key: number]: boolean} = {};

  // pairs of index value and direction
  const indexSeeds: [Point1D, Point1D][] = [];
  const seeds: {[key: number]: boolean} = {};
  const offset = range[0] - Math.round(range[0] / distance) * distance;
  indexes.forEach(i => {
    // snap
    const idx = Math.round(i / distance) * distance + offset;

    // only add if we don't already have a seed for this
    function add(ii: Point1D, d: Point1D) {
      if (!seeds[ii]) {
        indexSeeds.push([ii, d]);
        seeds[ii] = true;
      }
    }

    add(idx, distance);
    add(idx - distance, distance);
  });

  const next: () => Point1D | null = () => {
    if (indexSeeds.length === 0) {
      return null;
    }
    which %= indexSeeds.length;

    const ret = indexSeeds[which][0];

    if (ret in returned || ret < range[0] || range[1] < ret) {
      indexSeeds.splice(which, 1);
      return next();
    }

    // move new index value
    indexSeeds[which][0] += indexSeeds[which][1];

    // try the next seed
    which++;
    returned[ret] = true;
    return ret;
  };

  return next;
}

export function getKeys(query: QueryConfig) {
  // active view
  const active = `${query.activeView}:${query.index}`;

  const views = query.views.filter(v => v.name !== query.activeView);

  // brushes are in all views
  const brushes = views.map(v => {
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

  views.filter(v => v.query).forEach(v => {
    const br = brushes.filter(b => b[0] !== v.name).map(b => b[1]).join(' ');
    if (v.type === '1D') {
      keys[v.name] = `${v.name} ${active} ${v.range} ${br}`;
    } else {
      keys[v.name] = `${v.name} ${active} ${v.ranges} ${br}`;
    };
  });
  return keys;
}

export function new2DIterator(indexes: Point2D[], distance: Point2D, range: [Interval<number>, Interval<number>]) {
  let which = 0;

  const returned: {[key: string]: boolean} = {};

  const indexSeeds: [Point2D, Point2D][] = [];
  const seeds: {[key: string]: boolean} = {};

  const [dx, dy] = distance;

  const xOffset = range[0][0] - Math.round(range[0][0] / dx) * dx;
  const yOffset = range[1][0] - Math.round(range[1][0] / dy) * dy;

  indexes.forEach(i => {
    // snap
    const x = Math.round(i[0] / dx) * dx + xOffset;
    const y = Math.round(i[1] / dy) * dy + yOffset;

    // only add if we don't already have a seed for this
    function add(ii: Point2D, d: Point2D) {
      const key = `${ii[0]}_${ii[1]}`;
      if (!seeds[key]) {
        indexSeeds.push([ii, d]);
        seeds[key] = true;
      }
    }

    // go into 4 directions
    add([x, y], [dx, dy]);
    add([x - dx, y], [-dx, dy]);
    add([x, y - dy], [dx, -dy]);
    add([x - dx, y - dy], [-dx, -dy]);
  });

  const next: () => Point2D | null = () => {
    if (indexSeeds.length === 0) {
      return null;
    }
    which %= indexSeeds.length;

    const [x, y] = indexSeeds[which][0];
    const key = `${x}_${y}`;

    if (key in returned || x < range[0][0] || range[0][1] < x || y < range[1][0] || range[1][1] < y) {
      indexSeeds.splice(which, 1);
      return next();
    }

    // move new index value
    const [dxx, dyy] = indexSeeds[which][1];
    indexSeeds[which][0][0] += dxx;
    indexSeeds[which][0][1] += dyy;

    // try the next seed
    which++;
    returned[key] = true;
    return [x, y];
  };

  return next;
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
  private nextIndex: () => Point | null;

  private cache: {[key: string]: ResultRow};

  constructor(public readonly backend: Backend) { }

  // Set the sizes of the charts and initialize the session.
  public init(request: Init) {
    this.sizes = request.sizes;
    this.cache = {};

    if (config.optimizations.loadOnInit) {
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
      this.query(load);

      // load data for the first view, making the second one active
      const second = config.views[1];
      const activeLoad: Load = {
        type: 'load',
        index: second.type === '1D' ? second.range[1] : [second.ranges[0][1], second.ranges[1][1]],
        activeView: second.name,
        views: [{...first, query: true}]
      };
      this.query(activeLoad);
    }
  }

  public onQuery(cb: Callback) {
    this._onQuery = cb;
  }

  public preload(request: Preload) {
    this._preload = request;

    const view = request.views.filter(v => v.name === request.activeView)[0];

    const spacing = config.optimizations.preloadSpacing;

    if (view.type === '1D') {
      const width: number = this.sizes[view.name] as any;
      const distance =(view.range[1] - view.range[0]) / width * spacing;
      this.nextIndex = new1DIterator(request.indexes as Point1D[], distance, view.range);

      console.log('Create new 1D preload iterator', request.indexes, distance);
    } else {
      const dimensions: [number, number] = this.sizes[view.name] as any;
      const distance: Interval<number> = [
        (view.ranges[0][0] - view.ranges[0][1]) / dimensions[0] * spacing,
        (view.ranges[1][0] - view.ranges[1][1]) / dimensions[1] * spacing
      ];
      this.nextIndex = new2DIterator(request.indexes as Point2D[], distance, view.ranges);

      console.log('Create new 2D preload iterator', request.indexes, distance);
    }

    this.nextQuery();
  }

  private query(query: QueryConfig) {
    // assert that we don't query the active view
    const active = query.views.filter(v => v.name === query.activeView);
    if (active.length > 0 && active[0].query === true) {
      throw new Error('Cannot query the active view');
    }

    this.queryCount += query.views.filter(v => v.query).length;

    // sort views to guarantee stable keys
    query.views = query.views.sort((x, y) => ascending(x.name, y.name));

    // check for cached results
    const results: ResultData = {};
    const keys = getKeys(query);
    query.views.filter(v => v.query).forEach((v, i) => {
      const hit = this.cache[keys[v.name]];
      console.log(`hit for ${keys[v.name]}`);
      if (hit) {
        results[v.name] = hit;

        // no need to query any more
        query.views[i].query = false;
      }
    });

    const l = Object.keys(results).length;
    if (l) {
      console.log(`Sending cached result with ${l} entries`);
      if (this._onQuery) {
        this._onQuery(query, results);
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

  // Load a particular value immediately.
  public load(request: Load) {
    this.query(request);

    this.hasUserInteracted = true;
  }

  private nextQuery() {
    if (this._preload === undefined) {
      console.log('Nothing to preload');
      return;
    }

    const index = this.nextIndex();
    if (index === null) {
      console.log('Nothing left to preload');
      this._preload = undefined;
      return;
    }

    const request: QueryConfig = {
      index: index,
      activeView: this._preload.activeView,
      views: this._preload.views
    };

    this.query(request);
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
      const keys = getKeys(query);
      query.views.filter(v => v.query).forEach(v => {
        this.cache[keys[v.name]] = results[v.name];
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
