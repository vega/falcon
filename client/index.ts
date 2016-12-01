/// <reference path="../interfaces.d.ts" />

import BrushableBar from './viz/brushable-bar';
import connection from './ws';
import API from './api';
import * as d3 from 'd3';

const config: {dimensions: Dimension[]} = require('../config.json');

const vizs: {[dimension: string]: BrushableBar} = {};

const dimensions = config.dimensions;
let activeDimension = dimensions[0];

const api = new API(dimensions, connection);

const CHART_WIDTH = 500;
const CHART_HEIGHT = 250;

connection.onOpen(() => {
  const handleBrushStart = (dim: Dimension) => {
    return (domain: Interval) => {
      // api.setState(dim, domain);
    };
  };

  const handleBrushEnd = (dim: Dimension) => {
    return (domain: Interval) => {
      const viz = vizs[dim.name];
      const s = d3.event.selection || viz.x.range();
      const extent = (s.map(viz.x.invert, viz.x));

      api.setState(dim, extent);
    };
  };

  connection.onResult(api.onResult((dimension, data) => {
    // API filters the results so at this point
    // we only see results we want to draw to the
    // screen immediately.
    vizs[dimension].update(data);
  }));

  // Initialize empty charts
  dimensions.forEach(dim => {
    vizs[dim.name] = new BrushableBar(dim, {width: CHART_WIDTH, height: CHART_HEIGHT})
      .on('start', handleBrushStart(dim))
      .on('end', handleBrushEnd(dim));
  });

  // Initialize with resolutions
  api.init(dimensions.map((d) => {
    return {
      dimension: d.name,
      value: vizs[d.name].contentWidth
    };
  }));
});
