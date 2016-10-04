const server = require('http').createServer();
const url = require('url');
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server: server });
const express = require('express');
const app = express();
const port = 4080;

const SQL_QUERY = 'select min(timestamp) as time, min("air_temp") as temperature_min, max("air_temp") as temperature_max, avg("air_temp") as temperature_avg '+
  'from weather_seattle where timestamp > $1 and timestamp < $2 '+
  'group by width_bucket(timestamp, $1, $2, $3) order by time;';

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
