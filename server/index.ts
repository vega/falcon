import * as express from 'express';
import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';

const server = createServer();
const wss = new WebSocketServer({ server });
const app = express();

app.use(express.static(__dirname + '/../public'));

wss.on('connection', ws => {
  ws.on('close', () => console.debug('close'));

  ws.on('message', (message: string) => {
    console.debug(`received: ${message}`);
  });
});

server.on('request', app);
server.listen(8080, () => { console.info('Go to http://localhost:' + server.address().port); });
