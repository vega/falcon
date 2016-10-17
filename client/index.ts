/// <reference path="../interfaces.d.ts" />

import * as uuid from 'node-uuid';
import * as d3 from 'd3';
import BrushableBar from './viz/brushable-bar';
import connection from './ws';

const vizs: any = {};

connection.onOpen(() => {
  const q1: Request = {
    id: uuid.v4(),
    type: 'range',
    dims: ['ARR_DELAY', 'DISTANCE'],
  };

  connection.send(q1, (result: any) => {
    const dims = {};
    Object.keys(result.ranges).forEach((dim) => {
      dims[dim] = {
        domain: result.ranges[dim],
        numBins: 10
      }
    });
    // We've retrieved the ranges, now get the initial data...
    const q2: Request = {
      id: uuid.v4(),
      type: 'query',
      dims: dims
    };

    connection.send(q2, (result: any) => {
      console.log(result);
      switch(result.dim) {
        case 'ARR_DELAY':
          vizs.ARR_DELAY = new BrushableBar('#arr-delay', {
            x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            y: result.data
          })
        case 'DISTANCE':
          vizs.DISTANCE = new BrushableBar('#distance', {
            x: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            y: result.data
          })
      }
    });
  });

});
