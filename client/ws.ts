/// <reference path="../interfaces.d.ts" />

import * as pako from 'pako';

const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');

const callbacks: any = {};

ws.onmessage = (event) => {
  const inflated: any = pako.inflate(event.data, { to: 'string' });
  const result: Result = JSON.parse(inflated);
  callbacks.result && callbacks.result(result);
}

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
}


export default connection;
