/// <reference path="interfaces.d.ts" />
/// <reference path='node_modules/pg-promise/typescript/pg-promise.d.ts' />

import { createServer } from 'http';
import { Server as WebSocketServer } from 'ws';
import * as express from 'express';
import * as pgp from 'pg-promise';

const server = createServer();
const wss = new WebSocketServer({ server: server });
const app = express();
const port = 4080;

const config = {
  database: 'postgres',
  host: 'localhost', // Server hosting the postgres database
  port: 5432  // env var: PGPORT
};

const db = pgp({})(config);

app.use(express.static(__dirname + '/public'));

wss.on('connection', (ws) => {
  // const location = url.parse(ws.upgradeReq.url, true);
  // you might use location.query.access_token to authenticate or share sessions
  // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

  ws.on('message', (message: string) => {
    console.log('received: %s', message);

    const request: Request = JSON.parse(message);

    switch (request.type) {
      case 'range':
        const query = 'select ' + request.dims.map((d, i) => 'min("' + d + '"), max("' + d + '")').join(', ') + ' from flights;';

        db.one({ text: query, rowMode: 'array' }).then((data: any) => {
          let ranges: { [dim: string]: Rng } = {};
          for (let i = 0; i < request.dims.length; i++) {
            ranges[request.dims[i]] = [data[2 * i], data[2 * i + 1]];
          }

          const result: Result = {
            type: 'range',
            id: request.id,
            ranges,
          };

          ws.send(JSON.stringify(result));
        }).catch((error: Error) => {
          console.error(error);
        });

        break;
      case 'query':
        const GB_SQL_QUERY = 'select width_bucket("$1:raw", $2, $3, $4) as bucket, count(*) from flights where $5:raw group by bucket order by bucket asc;';

        Object.keys(request.dims).forEach(dim => {
          const props = request.dims[dim];

          const predicate = Object.keys(request.dims).filter(d => d !== dim && request.dims[d].range !== undefined).map(d => {
            const p = request.dims[d];
            if (p.range !== undefined) {
              return p.range[0] + '<"' + d + '" and "' + d + '"<' + p.range[1];
            }
          }).join(' and ');

          const start = props.domain[0];
          const end = props.domain[1];

          db.many(GB_SQL_QUERY, [dim, start, end, props.numBins, predicate])
            .then((data: any) => {
              const result: Result = {
                type: 'query',
                id: request.id,
                dim,
                data: data.map((d: {bucket: number, count: string}) => {
                  return +d.count;
                }),
              };

              ws.send(JSON.stringify(result));
            })
            .catch((error: Error) => {
              console.error(error);
            });
        });

        break;
    }
  });
});

server.on('request', app);
server.listen(port, () => { console.log('Listening on ' + server.address().port); });
