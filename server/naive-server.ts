import { createServer } from 'http';
import { initBackend } from './backend';

import * as express from 'express';
import * as config from '../config';

const backend = initBackend(config.database);
const dimensions = config.dimensions;

const server = createServer();
const app = express();

let ranges = {};
let originalRanges = {};
dimensions.forEach((dimension) => {
  ranges[dimension.name] = dimension.range;
  originalRanges[dimension.name] = dimension.range;
});

app.use(express.static(__dirname + '/../public'));


app.get('/init', (req, res) => {
  const predicates = dimensions.map((dimension) => {
    return {
      name: dimension.name,
      lower: dimension.range[0],
      upper: dimension.range[1]
    };
  });

  const queries = dimensions.map((dimension) => {
    return backend.query(dimension.name, predicates);
  });

  Promise
    .all(queries)
    .then((values) => {
      let retObject = {};
      values.forEach((results, i) => {
        retObject[dimensions[i].name] = results;
      });

      res.json(retObject);
    });
});

app.get('/loadRange', (req, res) => {
  const params = req.query;
  ranges[params.dimension] = [params.lower, params.upper];

  const dimLookup = [];
  const queries = dimensions.filter((dim) => dim.name !== params.dimension).map((dimension) => {
    const predicates = Object.keys(ranges).filter((dim) => dim !== dimension.name).map((dim) => {
      const range = ranges[dim];
      return {
        name: dim,
        lower: +range[0],
        upper: +range[1]
      };
    }).concat([{
      name: dimension.name,
      lower: +originalRanges[dimension.name][0],
      upper: +originalRanges[dimension.name][1]
    }]);

    dimLookup.push(dimension.name);
    return backend.query(dimension.name, predicates); 
  });

  Promise
    .all(queries)
    .then((values) => {
      let retObject = {};
      values.forEach((results, i) => {
        retObject[dimLookup[i]] = results;
      });

      res.json(retObject);
    });

});

server.on('request', app);
server.listen(config.port, () => { console.log('Go to http://localhost:' + server.address().port); });
