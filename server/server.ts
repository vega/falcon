import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';
import Session from './session';
import { initBackend } from './backend';
import * as express from 'express';
import * as pako from 'pako';
import * as config from '../config';

const backend = initBackend(config.database);

const server = createServer();
const wss = new WebSocketServer({ server: server });
const app = express();

app.use(express.static(__dirname + '/../public'));

wss.on('connection', (ws) => {
  const send = (obj: Object) => {
    const msg = config.optimizations.compression ? pako.deflate(JSON.stringify(obj), { to: 'string'}) : JSON.stringify(obj);
    ws.send(msg, (err) => {
      if (err) {
        console.warn(err);
      }
    });
  };

  const session = new Session(backend, config.views);

  session.onQuery((query, results) => {
    send({
      query,
      data: results
    } as Result);
  });

  ws.on('close', () => session.close());

  ws.on('message', (message: string) => {
    // console.debug('received: %s', message);
    const request: Request = JSON.parse(message);
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
      }
  });
});

server.on('request', app);
server.listen(config.port, () => { console.log('Go to http://localhost:' + server.address().port); });
