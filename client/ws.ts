import * as pako from 'pako';
import * as config from '../config';

const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');

const callbacks: any = {};

ws.onmessage = (event) => {
  setTimeout(() => {
    const inflated = config.optimizations.compression ? pako.inflate(event.data, { to: 'string' }) : event.data;
    const result: Result = JSON.parse(inflated);
    if(callbacks.result) {
      callbacks.result(result);
    }
  });

};

const connection = {
  onOpen: (callback) => {
    ws.onopen = callback;
  },

  send: (message: Request) => {
    ws.send(JSON.stringify(message));
  },

  onResult: (callback) => {
    callbacks['result'] = callback;
  }
};

export default connection;
