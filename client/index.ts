/// <reference path="../interfaces.d.ts" />

import * as uuid from 'node-uuid';
import BrushableBar from './viz/brushable-bar';
import connection from './ws';

const config = require('../config.json');

const vizs: any = {};

const formatQuery = (dims) => {
  const q: Request = {
    id: uuid.v4(),
    type: 'query',
    dims: dims
  };

  return q;
};

const dimensions = config.dimensions;

connection.onOpen(() => {
  const q1: Request = {
    id: uuid.v4(),
    type: 'range',
    dims: Object.keys(dimensions),
  };

  connection.send(q1, (result: any) => {
    const dims: any = {};
    Object.keys(result.ranges).forEach((dim) => {
      dims[dim] = {
        domain: result.ranges[dim],
        range: result.ranges[dim],
        numBins: 25
      }
    });

    const handleUpdate = (dimension, domain) => {
      dims[dimension].range = domain;

      connection.send(formatQuery(dims), (result: any) => {
        // Update the chart
        vizs[result.dim].update({
          values: result.data
        });
      });
    };

    // We've retrieved the ranges, now get the initial data...
    connection.send(formatQuery(dims), (result: any) => {
      vizs[result.dim] = new BrushableBar(dimensions[result.dim], Object.assign({}, dims[result.dim], {
        values: result.data
      })).on('brushed', (domain) => {
        handleUpdate(result.dim, domain);
      });
    });
  });

});
