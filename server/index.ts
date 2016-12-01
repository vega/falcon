/// <reference path="../interfaces.d.ts" />

import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';
import Session from './session';
import { initBackend } from './backend';
import * as express from 'express';
import * as pako from 'pako';

const config = require('../config.json');

const backend = initBackend(config.database);

const server = createServer();
const wss = new WebSocketServer({ server: server });
const app = express();

app.use(express.static(__dirname + '/../public'));

wss.on('connection', (ws) => {
  const send = (obj) => {
    ws.send(pako.deflate(JSON.stringify(obj), { to: 'string'}), (err) => {
      if (err) {
        console.warn(err);
      }
    });
  }

  const session = new Session(backend, config.dimensions);

  session.onQuery((activeDimension, dimension, results, index) => {
    send({
      activeDimension: activeDimension,
      dimension: dimension,
      data: results,
      index: index
    });
  });


  ws.on('close', () => session.close());

  ws.on('message', (message: string) => {
    console.log('received: %s', message);
    const request: Request = JSON.parse(message);
    switch (request.type) {
      case 'init':
        session.init(request.resolutions);
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
