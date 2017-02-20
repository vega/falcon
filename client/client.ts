import BrushableBar from './viz/brushable-bar';
import CacheVis from './viz/cache-vis';
import connection from './ws';
import API from './api';
import * as d3 from 'd3';

import * as config from '../config';

const vizs: {[dimension: string]: BrushableBar} = {};
let cacheVis: CacheVis | null = null;

const views = config.views.filter(v => v.type === '1D') as View1D[];

const api = new API(connection);

const CHART_WIDTH = 600;
const CHART_HEIGHT = 250;

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
      console.log(x);
      api.preload({} as Preload);
    };
  };

  /**
   * Mouse moves into the brush selection. We preload the start and end of the brush.
   */
  const preloadBrushSelection = (dimension: View) => {
    return () => {
      api.preload({} as Preload);
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

      api.load({} as Load);
    };
  };

  const handleBrushMove = (dimension: View) => {
    return () => {
      const viz = vizs[dimension.name];
      const xPixels = d3.mouse(viz.$content.node())[0];
      const s: Interval<number> = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));
      console.log(xPixels, calculateVelocity(xPixels));
      if (extent[0] === lastExtent[0]) {
        // move left side of brush
        // api.preload(dimension, extent[1], calculateVelocity(xPixels));
      } else if (extent[1] === lastExtent[1]) {
        // move right side of brush
        // api.preload(dimension, extent[0], calculateVelocity(xPixels));
      } else {
        // move the whole brush
        // api.preload(dimension, extent, calculateVelocity(xPixels));
      }
      lastExtent = extent;
    };
  };

  const handleBrushEnd = (dimension: View) => {
    return () => {
      brushing = false;
      const viz = vizs[dimension.name];
      const s = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));
      if (extent[0] === loadedStartValue) {
        // api.load(dimension, extent[1]);
      } else if (extent[1] === loadedStartValue) {
        // api.load(dimension, extent[0]);
      } else {
        // api.load(dimension, extent[0]);
        // api.load(dimension, extent[1]);
      }
      lastExtent = extent;
    };
  };

  connection.onResult(api.onResult((dimension, data, rangeError) => {
    // API filters the results so at this point
    // we only see results we want to draw to the
    // screen immediately.
    vizs[dimension].update(data, rangeError);

    if (cacheVis) {
      // cacheVis.update(cache.getDebugData());
    }
  }));

  if (config.debugging.visualizeCache) {
    cacheVis = new CacheVis(views, {width: CHART_WIDTH, height: 100});
  }

  // Initialize empty charts
  views.forEach(view => {
    vizs[view.name] = new BrushableBar(view as View1D, {width: CHART_WIDTH, height: CHART_HEIGHT})
      .onBrush('start', handleBrushStart(view))
      .onBrush('brush', handleBrushMove(view))
      .onBrush('end', handleBrushEnd(view))
      .onOverlay('mousemove', handleMousemove(view))
      .onOverlay('mouseout', preloadBrushSelection(view))
      .onSelection('mouseover', preloadBrushSelection(view));
  });

  // Initialize with resolutions
  let sizes: Sizes = {};
  views.forEach((view) => {
    sizes[view.name] = vizs[view.name].contentWidth;
  });
  api.init({
    type: 'init',
    sizes
  });
});
