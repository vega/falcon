const server = require('http').createServer();
const url = require('url');
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server: server });
const express = require('express');
const app = express();
const port = 4080;

const SQL_QUERY = 'select width_bucket($1, $2, $3, $4) as bucket, count(*) from flights group by bucket order by bucket asc;';

app.use(express.static(__dirname + '/public'));

app.use((req, res) => {
  res.send({ msg: "hello" });
});

wss.on('connection', (ws) => {
  var location = url.parse(ws.upgradeReq.url, true);
  // you might use location.query.access_token to authenticate or share sessions
  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

  ws.on('message', (message) => {
    console.log('received: %s', message);
  });

  ws.send('something');
});

server.on('request', app);
server.listen(port, () => { console.log('Listening on ' + server.address().port) });
