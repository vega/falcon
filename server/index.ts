/// <reference path="../interfaces.d.ts" />

import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';
import Session from './session';
import { initBackend } from './backend';
import * as express from 'express';
import * as pako from 'pako';

const config = require('../config.json');

const backend = initBackend(config.database);

console.log('hellow')
const server = createServer();
const wss = new WebSocketServer({ server: server });
const app = express();

app.use(express.static(__dirname + '/../public'));

wss.on('connection', (ws) => {
  const send = (obj) => {
    ws.send(pako.deflate(JSON.stringify(obj), { to: 'string'}));
  }

  const session = new Session(backend, config.dimensions);

  session.onQuery((dimension, results) => {
    console.log('dimension: ' + dimension);
    send({
      dimension: dimension,
      data: results
    });
  });

  ws.on('message', (message: string) => {
    console.log('received: %s', message);
    const request: Request = JSON.parse(message);
    switch (request.type) {
      case 'init':
        session.init();
        break;
      case 'load':
        session.load(request.dimension, request.value);
        break;
      case 'preload':
        session.preload(request.dimension, request.value, request.velocity);
        break;
      case 'setRange':
        session.setRange(request.dimension, request.range);
        break;
    }
  });
});

server.on('request', app);
server.listen(config.port || 4080, () => { console.log('Listening on ' + server.address().port); });
