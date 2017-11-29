import * as express from 'express';
import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';
import * as config from '../shared/config';
import Session from './session';

const server = createServer();
const wss = new WebSocketServer({ server });
const app = express();

// *
import Flights from './flight-backend';
const backend = new Flights();
/*/
import Random from './random-backend';
const backend = new Random();
// */

let session = new Session(backend);

app.use(express.static(__dirname + '/../public'));

wss.on('connection', ws => {
  session.onQuery((query, results) => {
    ws.send(JSON.stringify({
      query,
      data: results,
    }), err => {
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
      case 'preload':
        session.preload(request);
        break;
      case 'profile':
        session.profile(request);
        break;
      }
  });
});

server.on('request', app);
server.listen(config.port, () => { console.info('Go to http://localhost:' + server.address().port); });
