import BrushableBar from './viz/brushable-bar';
import CacheVis from './viz/cache-vis';
import connection from './ws';
import API from './api';
import * as d3 from 'd3';

import * as config from '../config';

const vizs: {[dimension: string]: BrushableBar} = {};
let cacheVis: CacheVis = null;

const dimensions = config.dimensions;

const api = new API(dimensions, connection);

const CHART_WIDTH = 600;
const CHART_HEIGHT = 250;

connection.onOpen(() => {

  let lastExtent: Range = null;
  let loadedStartValue: number = null;
  let lastX: number = 0;
  let lastVelocityTime: number = 0;

  const calculateVelocity = (xPixels) => {
      const t = Date.now();
      const v = (xPixels - lastX) / (t - lastVelocityTime);
      lastVelocityTime = t;
      lastX = xPixels;
      return v;
  }

  const handleHover = (dimension: Dimension) => {
    return (domain: Interval) => {
      // Start preloading values from this dimension.
      const viz = vizs[dimension.name];
      const xPixels = d3.mouse(viz.$content.node())[0];
      const x = viz.x.invert(xPixels);
      api.preload(dimension, x, calculateVelocity(xPixels));
    };
  };

  const handleBrushStart = (dimension: Dimension) => {
    return (domain: Interval) => {
      const viz = vizs[dimension.name];
      const s = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));

      // Extent [0] === [1] in this case so it doesn't matter
      // which we use. We need to hang on to this value tho
      // so that we can load the proper one on brush end.
      lastExtent = extent;

      loadedStartValue = extent[0];

      api.load(dimension, extent[0]);
    };
  };

  const handleBrushMove = (dimension: Dimension) => {
    return (domain: Interval) => {
      const viz = vizs[dimension.name];
      const xPixels = d3.mouse(viz.$content.node())[0];
      const s = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));
      api.setState(dimension, extent);
      if (extent[0] === lastExtent[0]) {
        // move left side of brush
        api.preload(dimension, extent[1], calculateVelocity(xPixels));
      } else if (extent[1] === lastExtent[1]) {
        // move right side of brush
        api.preload(dimension, extent[0], calculateVelocity(xPixels));
      } else {
        // move the whole brush
        api.preload(dimension, extent, calculateVelocity(xPixels));
      }
      lastExtent = extent;
    };
  };

  const handleBrushEnd = (dimension: Dimension) => {
    return (domain: Interval) => {
      const viz = vizs[dimension.name];
      const s = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));
      api.setRange(dimension, extent);
      if (extent[0] === loadedStartValue) {
        api.load(dimension, extent[1]);
      } else if (extent[1] === loadedStartValue) {
        api.load(dimension, extent[0]);
      } else {
        api.load(dimension, extent[0]);
        api.load(dimension, extent[1]);
      }
      lastExtent = extent;
    };
  };

  connection.onResult(api.onResult((dimension, data, range) => {
    // API filters the results so at this point
    // we only see results we want to draw to the
    // screen immediately.
    vizs[dimension].update(data);

    if (cacheVis) {
      cacheVis.update(api.cache.getDebugData());
    }
  }));

  if (config.debugging.visualizeCache) {
    cacheVis = new CacheVis(dimensions, {width: CHART_WIDTH, height: 100});
  }

  // Initialize empty charts
  dimensions.forEach(dim => {
    vizs[dim.name] = new BrushableBar(dim, {width: CHART_WIDTH, height: CHART_HEIGHT})
      .on('mousemove', handleHover(dim))
      .onBrush('start', handleBrushStart(dim))
      .onBrush('brush', handleBrushMove(dim))
      .onBrush('end', handleBrushEnd(dim));
  });

  // Initialize with resolutions
  api.init(dimensions.map((d) => {
    return {
      dimension: d.name,
      value: vizs[d.name].contentWidth
    };
  }));
});
