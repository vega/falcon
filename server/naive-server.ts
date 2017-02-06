import { createServer } from 'http';
import { initBackend } from './backend';

import * as express from 'express';
import * as config from '../config';

const backend = initBackend(config.database);
const dimensions = config.dimensions;

const server = createServer();
const app = express();

const brushes: {[dim: string]: Interval} = {};

app.use(express.static(__dirname + '/../public'));


app.get('/init', (req, res) => {
  const predicates: QueryConfig = {};

  dimensions.forEach((dimension) => {
    predicates[dimension.name] = {
      query: true,
      range: dimension.range,
      bins: dimension.bins
    };
  });

  backend.query(predicates)
    .then((result) => {
      res.json(result);
    })
    .catch(console.error)
});

app.get('/loadRange', (req, res) => {
  const params = req.query;
  brushes[params.dimension] = [params.lower, params.upper];

  const predicates: QueryConfig = {};

  dimensions.forEach((dimension) => {
    const pred: QueryDimension = {
      query: true,
      range: dimension.range,
      bins: dimension.bins
    };

    const brush = brushes[dimension.name];
    if (brush) {
      pred.lower = brush[0];
      pred.upper = brush[1];
    };

    predicates[dimension.name] = pred;
  });

  console.log(brushes);

  backend.query(predicates)
    .then((result) => {
      res.json(result);
    })
    .catch(console.error);
});

server.on('request', app);
server.listen(config.port, () => { console.log('Go to http://localhost:' + server.address().port); });
