import {Request, Result} from '../interfaces';

const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');
ws.onmessage = function (event) {
  console.log(event);
};

ws.onopen = () => {
  ws.send('message');
};

// just for demo
const a: Result = null;

switch (a.type) {
  case 'query':
    console.log(a.data);
    break;
  case 'range':
    console.log(a.ranges);
    break;
}
