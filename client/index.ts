/// <reference path="../interfaces.d.ts" />

import * as uuid from 'node-uuid';
import BrushableBar from './viz/brushable-bar';
import connection from './ws';

const config = require('../config.json');

const vizs: any = {};

const dimensions = config.dimensions;
let activeDimension = dimensions[0];

connection.onOpen(() => {

  connection.onResults((results) => {
    // This should update our query cache, not the actual viz itself.
    if (vizs[results.dimension]) {
      vizs[results.dimension].update(results.data);
    } else {
      const dim = config.dimensions.find(d => d.name === results.dimension);
      vizs[results.dimension] = new BrushableBar(dim, results.data, {width: 500, height: 300}).on('brushed', (domain) => {
        // handleUpdate(result.dim, domain);
        console.log('brushed.');
        console.log(domain);
      });
    }
  });

  connection.send({
    type: 'init' 
  });

  
});
