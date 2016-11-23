/// <reference path="../interfaces.d.ts" />

import * as uuid from 'node-uuid';
import BrushableBar from './viz/brushable-bar';
import connection from './ws';
import API from './api';

const config = require('../config.json');

const vizs: any = {};

const dimensions = config.dimensions;
let activeDimension = dimensions[0];

const api = new API(dimensions, connection, vizs);

connection.onOpen(() => {

  // TODO: break this down into brush start, end, etc.
  const handleBrush = (dim: Dimension) => {
    return (domain: Interval) => {
      api.setState(dim, domain);
    };
  };

  connection.onResults(api.onResults((results) => {
    // API filters the results so at this point
    // we only see results we want to draw to the 
    // screen immediately. 
    if (vizs[results.dimension]) {
      vizs[results.dimension].update(results.data);
    } else {
      const dim = config.dimensions.find(d => d.name === results.dimension);
      vizs[results.dimension] = new BrushableBar(dim, results.data, {width: 500, height: 300}).on('brushed', handleBrush(dim));
    }
  }));

  connection.send({
    type: 'init' 
  });

  
});
