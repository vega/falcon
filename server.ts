/// <reference path="interfaces.d.ts" />

import {createServer} from 'http';
import {Server as WebSocketServer} from 'ws';
import * as url from 'url';
import * as express from 'express';

const server = createServer();
const wss = new WebSocketServer({ server: server });
const app = express();
const port = 4080;

const SQL_QUERY = 'select width_bucket($1, $2, $3, $4) as bucket, count(*) from flights group by bucket order by bucket asc;';

app.use(express.static(__dirname + '/public'));

wss.on('connection', (ws) => {
  // const location = url.parse(ws.upgradeReq.url, true);
  // you might use location.query.access_token to authenticate or share sessions
  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

  ws.on('message', (message: string) => {
    console.log('received: %s', message);
  });

  const result: Result = {
    type: 'range',
    ranges: {
      arrDealy: [-20, 100]
    },
  };

  ws.send(JSON.stringify(result));
});

server.on('request', app);
server.listen(port, () => { console.log('Listening on ' + server.address().port); });
