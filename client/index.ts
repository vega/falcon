/// <reference path="../interfaces.d.ts" />

import BrushableBar from './viz/brushable-bar';
import connection from './ws';
import API from './api';

const config = require('../config.json');

const vizs: any = {};

const dimensions = config.dimensions;
let activeDimension = dimensions[0];

const api = new API(dimensions, connection);

const CHART_WIDTH = 300;

connection.onOpen(() => {
  // TODO: break this down into brush start, end, etc.
  const handleBrushStart = (dim: Dimension) => {
    return (domain: Interval) => {
      // api.setState(dim, domain);
    };
  };

  const handleBrushEnd = (dim: Dimension) => {
    console.log('brushend')
    return (domain: Interval) => {
      const viz = vizs[dim.name];
      let extent = viz.brush.extent();
      if (extent[1] === extent[0]) {
        extent = dim.range;
      }
      api.setState(dim, extent);
    };
  };

  connection.onResult(api.onResult((dimension, data) => {
    // API filters the results so at this point
    // we only see results we want to draw to the 
    // screen immediately. 
    if (vizs[dimension]) {
      vizs[dimension].update(data);
    } else {
      const dim = config.dimensions.find(d => d.name === dimension);
      vizs[dimension] = new BrushableBar(dim, data, {width: CHART_WIDTH, height: 250})
        .on('brush start', handleBrushStart(dim))
        .on('brush end', handleBrushEnd(dim));
    }
  }));

  // Initialize with resolutions
  api.init(dimensions.map((d) => {
    return {
      dimension: d.name,
      value: CHART_WIDTH
    };
  }));

});
