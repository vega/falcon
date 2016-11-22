/// <reference path="../interfaces.d.ts" />

import * as uuid from 'node-uuid';
import BrushableBar from './viz/brushable-bar';
import connection from './ws';

const config = require('../config.json');

const vizs: any = {};

const dimensions = config.dimensions;

connection.onOpen(() => {
  
  dimensions.forEach(dimension => {
    vizs[dimension.name] = new BrushableBar(dimension, {width: 500, height: 300}).on('brushed', (domain) => {
        // handleUpdate(result.dim, domain);
        console.log(domain);
    });
  })
  

  connection.send({
    type: 'init' 
  });
  
});
