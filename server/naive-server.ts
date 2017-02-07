import { createServer } from 'http';
import { initBackend } from './backend';

import * as express from 'express';
import * as config from '../config';

const backend = initBackend(config.database);
const views = config.views;

const server = createServer();
const app = express();

const brushes: {[dim: string]: Interval<number> | [Interval<number>, Interval<number>]} = {};

app.use(express.static(__dirname + '/../public'));


app.get('/init', (req, res) => {
  const viewQueries: ViewQuery[] = [];
  views.forEach((v) => {
    if (v.type === '1D') {
      const q: ViewQuery1D = {
        type: '1D',
        query: true,
        name: v.name,
        range: v.range
      };
      viewQueries.push(q);
    } else {
      const q: ViewQuery2D = {
        type: '2D',
        query: true,
        name: v.name,
        ranges: v.ranges
      };
      viewQueries.push(q);
    }
  });

  backend.query({ views: viewQueries })
    .then((result: ResultData) => {
      res.json(result);
    })
    .catch(console.error);
});

app.get('/loadRange', (req, res) => {
  const params = req.query;

  const view = config.viewIndex[params.view];
  if (view.type === '1D') {
    brushes[params.view] = [params.lower, params.upper];
  } else {
    brushes[params.view] = [params.lower1, params.upper1, params.lower2, params.upper2];
  }

  brushes[params.dimension] = [params.lower, params.upper];

  const viewQueries: ViewQuery[] = [];

  views.forEach((v) => {
    if (v.type === '1D') {
      const q: ViewQuery1D = {
        type: '1D',
        query: true,
        name: v.name,
        range: v.range,
        brush: brushes[v.name] as Interval<number>
      };
      viewQueries.push(q);
    } else {
      const q: ViewQuery2D = {
        type: '2D',
        query: true,
        name: v.name,
        ranges: v.ranges,
        brushes: brushes[v.name] as [Interval<number>, Interval<number>]
      };
      viewQueries.push(q);
    }
  });

  backend.query({ views: viewQueries })
    .then((result: ResultData) => {
      res.json(result);
    })
    .catch(console.error);
});

server.on('request', app);
server.listen(config.port, () => { console.log('Go to http://localhost:' + server.address().port); });
