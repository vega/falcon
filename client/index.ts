/// <reference path="../interfaces.d.ts" />

import * as uuid from 'node-uuid';
import * as d3 from 'd3';
import BrushableBar from './viz/brushable-bar';

const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');
ws.onmessage = (event) => {
  console.log(event);
  const result: Result = JSON.parse(event.data);

  switch (result.type) {
    case 'query':
      console.log(result.data);
      break;
    case 'range':
      console.log(result.ranges);
      break;
  }
};

ws.onopen = () => {
  const q1: Request = {
    id: uuid.v4(),
    type: 'range',
    dims: ['ARR_DELAY', 'DISTANCE'],
  };

  ws.send(JSON.stringify(q1));

  const q2: Request = {
    id: uuid.v4(),
    type: 'query',
    dims: {
      ARR_DELAY: {
        domain: [-79, 1659],
        numBins: 10,
        range: [0, 200]
      },
      DISTANCE: {
        domain: [31, 4983],
        numBins: 15,
        range: [10, 1500]
      }
    }
  };

  ws.send(JSON.stringify(q2));
};



// TODO - send the initial query to get ranges
