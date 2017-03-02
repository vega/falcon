import BrushableBar from './viz/brushable-bar';
// import Brushable2D from './viz/brushable-2d';
import CacheVis from './viz/cache-vis';
import connection from './ws';
import API from './api';
import * as d3 from 'd3';
import { ZoomTree } from './cache/zoom-tree';

import * as config from '../config';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 250;

const vizs: {[dimension: string]: BrushableBar} = {};
let cacheVis: CacheVis | null = null;

let activeView: string = "ARR_DELAY";

/**
 * We need to go from
 * active dimension -> current dimension -> zoom tree -> ranges -> data
 */
const cache: {[view: string]: {[view: string]: ZoomTree}} = {};
const views = config.views.filter(v => v.type === '1D') as View1D[];
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
      return {
        type: v.type,
        range: vizs[v.name].x.range() as [number, number],
        query: true,
        name: v.name
      };
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
      const viz = vizs[dimension.name];
      const xPixels = d3.mouse(viz.$content.node())[0];

      const x = viz.x.invert(xPixels);

      console.log('handleMousemove');
      api.preload({
        activeView: Object.assign({}, dimension, { range: viz.x.range() }),
        views: getInactiveViews(dimension),
        indexes: [x],
        velocity: calculateVelocity(xPixels)
      });
    };
  };

  /**
   * Mouse moves into the brush selection. We preload the start and end of the brush.
   */
  const preloadBrushSelection = (dimension: View) => {
    return () => {
      // TODO - make sure the brush is turned on..
      console.log('preloadBrushSelection');
      // api.preload({

      // } as Preload);
    };
  };

  const handleBrushStart = (dimension: View) => {
    return () => {
      brushing = true;
      hasBrushed = true;
      const viz = vizs[dimension.name];
      const s = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));

      // Extent [0] === [1] in this case so it doesn't matter
      // which we use. We need to hang on to this value tho
      // so that we can load the proper one on brush end.
      lastExtent = extent;

      loadedStartValue = extent[0];


      api.load({
        activeView: Object.assign({}, dimension, { range: viz.x.range() }),
        views: getInactiveViews(dimension),
        index: extent[0]
      });
    };
  };

  const handleBrushMove = (dimension: View) => {
    return () => {
      const viz = vizs[dimension.name];
      const xPixels = d3.mouse(viz.$content.node())[0];
      const s: Interval<number> = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));

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
      console.log('handleBrushmove');
      api.preload({
        activeView: Object.assign({}, dimension, { range: viz.x.range() }),
        views: getInactiveViews(dimension),
        indexes: indexes,
        velocity: calculateVelocity(xPixels)
      });
      lastExtent = extent;
    };
  };

  const handleBrushEnd = (dimension: View) => {
    return () => {
      brushing = false;
      const viz = vizs[dimension.name];
      const s = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));
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
      const activeView = Object.assign({}, dimension, { range: viz.x.range() });
      loadIndices.forEach((index) => {
        api.load({ activeView, views, index });
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
            resolution: 0,
            ranges: [view.range],
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
    cacheVis = new CacheVis(views, {width: CHART_WIDTH, height: 100});
  }

  // Initialize empty charts
  views.forEach(view => {
    if (view.type === '1D') {
      vizs[view.name] = new BrushableBar(view as View1D, {width: CHART_WIDTH, height: CHART_HEIGHT})
    } else {
      // vizs[view.name] = new Brushable2D(view as View2D, {width: CHART_WIDTH, height: CHART_HEIGHT})
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
    sizes[view.name] = vizs[view.name].contentWidth;
  });

  config.views.forEach((activeView, i) => {
    cache[activeView.name] = {};
    config.views.forEach((dataView, j) => {
      if (i === j) {
        return;
      }
      const inactiveViews = config.views.filter((_, k) => j !== k).map((v) => v.name);
      let dimensionView;

      if (dataView.type === '1D') {
        dimensionView = dataView as View1D;
        cache[activeView.name][dataView.name] = new ZoomTree(1, [sizes[dataView.name] as number], [dataView.range], inactiveViews);
      } else {
        dimensionView = dataView as View2D;
        // TODO - need to update `sizes` before this will work
        // cache[activeView.name][dataView.name] = new ZoomTree(2, [CHART_WIDTH, CHART_HEIGHT], dataView.ranges, inactiveViews);
      }
    });
  });

  const updateViz = (name: string) => {
    const brushes: {[dimension: string]: Interval<number>} = {};

    // TOOO - Make sure we are getting the correct
    //        brush extents, and don't pass anything in
    //        for an empty brush.
    // views.filter((view) => view.name !== name).forEach((view) => {
      // const viz = vizs[view.name];
      // if (viz.brush.empty()) {
      //   return;
      // }
      // const extentFunc = viz.brush.extent() as any;
      // const extent = extentFunc() as [[number, number], [number, number]];
      // const brushVal = [vizs[view.name].x.invert(extent[0][0]), vizs[view.name].x.invert(extent[1][0])];
      // brushes[view.name] = brushVal as Interval<number>;
    // });

    const viz = vizs[name];
    if (!viz) {
      return;
    }
    const data = cache[activeView][name].get({
      activeRangeIndices: [[0, 100]],
      resolution: 0,
      ranges: [viz.x.domain() as [number, number]],
      brushes: brushes
    });

    if (data) {
      viz.update(data as number[], 0);
    }
  }

  api.init({
    sizes
  });
});
