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
  const q: Request = {
    id: uuid.v4(),
    type: 'range',
    dims: ['ARR_DELAY', 'DISTANCE'],
  };

  ws.send(JSON.stringify(q));
};



// TODO - send the initial query to get ranges
