import * as express from 'express';
import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';
import * as config from '../shared/config';
import Session from './session';

const server = createServer();
const wss = new WebSocketServer({ server });
const app = express();

import Flights from './flight-backend';
const backend = new Flights();

let session = new Session(backend);

app.use(express.static(__dirname + '/../public'));

wss.on('connection', ws => {
  session.onQuery((response: ApiResult) => {
    ws.send(JSON.stringify(response), err => {
      if (err) {
        console.warn(err);
      }
    });
  });

  ws.on('close', () => {
    session.close();
    session = new Session(backend);
  });

  ws.on('message', (message: string) => {
    const request: ApiRequest = JSON.parse(message);

    if (config.debugging.logApi) {
      console.info(request);
    }

    switch (request.type) {
      case 'init':
        session.init(request);
        break;
      case 'load':
        session.load(request);
        break;
    }
  });

  ws.on('error', e => {
    console.error(e);
  });
});

server.on('request', app);
server.listen(config.port, () => { console.info('Go to http://localhost:' + config.port); });
