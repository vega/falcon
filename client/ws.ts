import * as pako from 'pako';
import * as config from '../config';

const host = window.document.location.host.replace(/:.*/, '');
const ws = new WebSocket('ws://' + host + ':4080');

const callbacks: {
  result?: (data: any) => void
} = {
  result: undefined
};

ws.onmessage = (event) => {
  setTimeout(() => {
    const inflated = config.optimizations.compression ? pako.inflate(event.data, { to: 'string' }) : event.data;
    const result: any = JSON.parse(inflated);
    if(callbacks.result) {
      callbacks.result(result);
    }
  });
};

const connection: Connection = {
  onOpen: (callback) => {
    ws.onopen = callback;
  },

  send: (message) => {
    ws.send(JSON.stringify(message));
  },

  onResult: (callback) => {
    callbacks.result = callback;
  }
};

export type Connection = {
    onOpen: (callback: () => void) => void;
    send: (message: Request) => void;
    onResult: (callback: (data: any) => void) => void;
};

export default connection;
