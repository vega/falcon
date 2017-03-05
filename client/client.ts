import BrushableBar from './viz/brushable-bar';
import Brushable2D from './viz/brushable-2d';
import CacheVis from './viz/cache-vis';
import connection from './ws';
import API from './api';
import * as d3 from 'd3';
import { ZoomTree } from './cache/zoom-tree';

import * as config from '../config';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 250;

const vizs: {[dimension: string]: BrushableBar | Brushable2D} = {};
const brushes: {[view: string]: (d3.BrushSelection | 'nobrush')} = {};
let cacheVis: CacheVis | null = null;

let activeView: string = "ARR_DELAY";

/**
 * We need to go from
 * active dimension -> current dimension -> zoom tree -> ranges -> data
 */
const cache: {[view: string]: {[view: string]: ZoomTree}} = {};
const views = config.views;
const api = new API(connection);

connection.onOpen(() => {

  let lastExtent: Interval<number | null> = [null, null];
  let loadedStartValue: number | null = null;
  let lastX: number = 0;
  let lastVelocityTime: number = 0;

  const calculateVelocity = (xPixels: number) => {
      const t = Date.now();
      const v = (xPixels - lastX) / (t - lastVelocityTime);
      lastVelocityTime = t;
      lastX = xPixels;
      return v;
  };

  const getInactiveViews = (dimension: View) => {
    return views.filter(v => { return v.name !== dimension.name }).map((v) => {

      if (v.type === '1D') {
        return {
          type: v.type,
          range: vizs[v.name].x.domain() as [number, number],
          query: true,
          name: v.name
        };
      } else if (v.type === '2D') {
        return {
          type: v.type,
          ranges: [vizs[v.name].x.domain(), vizs[v.name].y.domain()] as [[number, number], [number, number]],
          query: true,
          name: v.name
        }
      } else {
        throw new Error('More than 2 Dimensions not supported');
      }
    });
  }

  let brushing = false;
  let hasBrushed = false;

  const handleMousemove = (dimension: View) => {
    return () => {
      if (!hasBrushed || brushing) {
        return;
      }
      // Start preloading values from this dimension.
      // const viz = vizs[dimension.name];
      // const xPixels = d3.mouse(viz.$content.node())[0];
      // const x = viz.x.invert(xPixels);
      // api.preload({
      //   activeView: Object.assign({}, dimension, { range: viz.x.domain() }),
      //   views: getInactiveViews(dimension),
      //   indexes: [x],
      //   velocity: calculateVelocity(xPixels)
      // });
    };
  };

  /**
   * Mouse moves into the brush selection. We preload the start and end of the brush.
   */
  const preloadBrushSelection = (dimension: View) => {
    return () => {
      // TODO - make sure the brush is turned on..
      // console.log('preloadBrushSelection');
      // api.preload({

      // } as Preload);
    };
  };

  const loadClosestForView = (view: string) => {
    var t0 = performance.now();
    let activeRangeIndices: any;
    if (brushes[activeView] as any === 'nobrush') {
      activeRangeIndices = vizs[activeView].x.domain();
    } else {
      activeRangeIndices = brushes[activeView];
    }
    const viz = vizs[view];
    const inactiveBrushes: {[dimension: string]: Interval<number>} = {};
    views.filter((view) => view.name !== name && view.name !== activeView).forEach((view) => {
      inactiveBrushes[view.name] = brushes[view.name] as [number, number];
    });

    console.log(cache);
    console.log(activeView + ' ' + view);
    const { data, distance } = cache[activeView][view].get({
      activeRangeIndices: [activeRangeIndices as [number, number]],
      resolution: 0,
      ranges: [viz.x.domain() as [number, number]],
      brushes: inactiveBrushes
    });

    if (data) {
      viz.update(data as number[], 0);
    }
    var t1 = performance.now();

    if (config.debugging.logPerformace) {
      console.log("Load closest took " + (t1 - t0) + " milliseconds.");
    }
    return distance;
  }

  const load = (loadQuery: Load) => {
    // 1. Do a cache get.
    // 2. If the distance is nonzero (or more than some epsilon?),
    //    do a load call.
    var t0 = performance.now();
    const loadViews: ViewQuery[] = [];
    loadQuery.views.forEach((inactiveView) => {
      const distance = loadClosestForView(inactiveView.name);
      if (distance > 0) {
        loadViews.push(inactiveView);
      }
    })
    api.load(Object.assign({}, loadQuery, { views: loadViews }));
    var t1 = performance.now();
    if (config.debugging.logPerformace) {
      console.log("Load took " + (t1 - t0) + " milliseconds.");
    }
  };

  const handleBrushStart = (dimension: View) => {
    return () => {
      brushing = true;
      hasBrushed = true;
      activeView = dimension.name;
      const viz = vizs[dimension.name];
      const s = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));
      brushes[dimension.name] = extent;
      // Extent [0] === [1] in this case so it doesn't matter
      // which we use. We need to hang on to this value tho
      // so that we can load the proper one on brush end.
      lastExtent = extent;
      loadedStartValue = extent[0];

      load({
        activeView: Object.assign({}, dimension, { range: viz.x.domain() }),
        views: getInactiveViews(dimension),
        index: extent[0]
      });
    };
  };

  const handleBrushMove = (dimension: View) => {
    return () => {
      const viz = vizs[dimension.name];
      // const xPixels = d3.mouse(viz.$content.node())[0];
      const s: Interval<number> = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));
      brushes[dimension.name] = extent;
      let indexes: Point[] = [];
      if (extent[0] === lastExtent[0]) {
        // move left side of brush
        indexes.push(extent[1]);
      } else if (extent[1] === lastExtent[1]) {
        // move right side of brush
        indexes.push(extent[0]);
      } else {
        // move the whole brush
        indexes = indexes.concat(extent);
      }
      const inactiveViews = getInactiveViews(dimension);
      inactiveViews.forEach((view) => {
        loadClosestForView(view.name);
      });

      // api.preload({
      //   activeView: Object.assign({}, dimension, { range: viz.x.domain() }),
      //   views: inactiveViews,
      //   indexes: indexes,
      //   velocity: calculateVelocity(xPixels)
      // });
      lastExtent = extent;
    };
  };

  const handleBrushEnd = (dimension: View) => {
    return () => {
      brushing = false;
      const viz = vizs[dimension.name];
      const s = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));
      brushes[dimension.name] = extent;
      const loadIndices = [];
      if (extent[0] === loadedStartValue) {
        loadIndices.push(extent[1]);
      } else if (extent[1] === loadedStartValue) {
        loadIndices.push(extent[0]);
      } else {
        loadIndices.push(extent[0]);
        loadIndices.push(extent[1]);
      }

      const views = getInactiveViews(dimension);
      const activeView = Object.assign({}, dimension, { range: viz.x.domain() });
      loadIndices.forEach((index) => {
        load({ activeView, views, index });
      });
      lastExtent = extent;
    };
  };

  const handleZoom = (view: View) => {
    return (transform: d3.ZoomTransform, resolutionChanged: boolean) => {
      if (resolutionChanged) {
        // TODO - Fetch data at this new resolution
        console.log(view.name + ' zoomed to resolution ' + transform.k);
      }
    };
  }

  api.onResult((result: Result) => {
    /**
     * 1. Put the new data in the cache
     * 2. Update the viz with the closest data,
     *    given that it may have changed
     */
     result.query.views.forEach((view, i) => {
       if (!result.query.activeView) {
        console.log('No active view');
        // TODO - what should we do in this case?
        //        pick a random one?
        return;
       }

      let brushes: {[dimension: string]: Interval<number>} = {};
      result.query.views.forEach((inactiveView, j) => {
        if (inactiveView.type === '1D' && inactiveView.brush) {
          brushes[inactiveView.name] = inactiveView.brush;
        } else if (inactiveView.type === '2D' && inactiveView.brushes) {
          // TODO - 2d case
        }
      });

      if (view.type === '1D') {
        // TODO - What does "no index" mean?
        const index = (result.query.index as number) || -1;
        cache[result.query.activeView.name][view.name].set({
            resolution: 0, // TODO - set resolution properly...
            ranges: [view.range],
            indices: [index],
            brushes: brushes
          }, result.data[view.name]);
      } else {
        console.log('2D RESULTS');
        console.log(view);
        const index = (result.query.index as number) || -1;
        cache[result.query.activeView.name][view.name].set({
            resolution: 0, // TODO - set resolution properly...
            ranges: view.ranges,
            indices: [index],
            brushes: brushes
          }, result.data[view.name]);

      }
    })

    // If the active dimension is correct,
    // for each view in the returned data, have it update from the cache.
    if (result.query.activeView && activeView === result.query.activeView.name) {
      result.query.views.forEach((view) => {

        updateViz(view.name);
      });
    }

    if (cacheVis) {
      // cacheVis.update(cache.getDebugData());
    }
  });

  if (config.debugging.visualizeCache) {
    // cacheVis = new CacheVis(views, {width: CHART_WIDTH, height: 100});
  }

  // Initialize empty charts
  views.forEach(view => {
    brushes[view.name] = 'nobrush';
    if (view.type === '1D') {
      vizs[view.name] = new BrushableBar(view as View1D, {width: CHART_WIDTH, height: CHART_HEIGHT});
    } else {
      vizs[view.name] = new Brushable2D(view as View2D, {width: CHART_WIDTH, height: CHART_HEIGHT});
      return;
    }

    vizs[view.name]
      .onBrush('start', handleBrushStart(view))
      .onBrush('brush', handleBrushMove(view))
      .onBrush('end', handleBrushEnd(view))
      .onOverlay('mousemove', handleMousemove(view))
      .onOverlay('mouseout', preloadBrushSelection(view))
      .onSelection('mouseover', preloadBrushSelection(view))
      .onTransform(handleZoom(view));
  });

  // Initialize with resolutions
  let sizes: Sizes = {};
  views.forEach((view) => {
    if (view.type === '1D') {
      sizes[view.name] = vizs[view.name].contentWidth;
    } else {
      sizes[view.name] = [vizs[view.name].contentWidth, vizs[view.name].contentHeight];
    }
  });

  views.forEach((activeView, i) => {
    cache[activeView.name] = {};
    views.forEach((dataView, j) => {
      if (i === j) {
        return;
      }
      const inactiveViews = views.filter((_, k) => j !== k && i !== k).map((v) => v.name);
      if (activeView.type === '1D') {
        if (dataView.type === '1D') {
          cache[activeView.name][dataView.name] = new ZoomTree(1, 1, [sizes[activeView.name] as number], [dataView.range], inactiveViews);
        } else {
          cache[activeView.name][dataView.name] = new ZoomTree(1, 2, [sizes[activeView.name] as number], dataView.ranges, inactiveViews);
        }
      } else {
        if (dataView.type === '1D') {
          cache[activeView.name][dataView.name] = new ZoomTree(2, 1, sizes[activeView.name] as [number, number], [dataView.range], inactiveViews);
        } else {
          cache[activeView.name][dataView.name] = new ZoomTree(2, 2, sizes[activeView.name] as [number, number], dataView.ranges, inactiveViews);
        }
      }
    });
  });

  const updateViz = (name: string) => {
    const inactiveBrushes: {[dimension: string]: Interval<number>} = {};
    views.filter((view) => view.name !== name && view.name !== activeView).forEach((view) => {
      inactiveBrushes[view.name] = brushes[view.name] as [number, number];
    });

    const viz = vizs[name];
    if (!viz) {
      return;
    }

    loadClosestForView(name);
  }

  api.init({
    sizes
  });
});
