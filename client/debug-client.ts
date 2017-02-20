import connection from './ws';
import API from './api';
import * as d3 from 'd3';

import * as config from '../config';

const views = config.views.filter(v => v.type === '1D');

let sizes: Sizes = {};
config.views.forEach((view) => {
  sizes[view.name] = 500;
});
const INIT: Init = {
  type: 'init',
  sizes
};

/*
const LOAD_MESSAGE: Load = {
  type: 'load',
  index: 10,
  activeView: 'ARR_DELAY',
  views: views.map((v: View1D) => {
    return {
      type: v.type,
      query: v.name !== 'ARR_DELAY',
      name: v.name,
      range: v.range
    };
  })
};
/*/
const PRE_LOAD_MESSAGE: Preload = {
  type: 'preload',
  indexes: [-5, 20],
  velocity: 10,
  activeView: 'ARR_DELAY',
  views: views.map((v: View1D) => {
    return {
      type: v.type,
      query: v.name !== 'ARR_DELAY',
      name: v.name,
      range: v.range
    };
  })
};
// */

const div = d3.select('body').append('div');

const textarea = div.append('textarea').style('display', 'block').style('height', '500px').style('width', '700px').text(JSON.stringify(PRE_LOAD_MESSAGE, null, 2));
const button = div.append('button').style('margin', '8px 0').style('font-size', '1.4em').text('Send request');
const output = div.append('div').style('font-size', '0.9em');

const api = new API(connection);

connection.onOpen(() => {
  output.append('p').text('Socket initialized');

  api.onResult((result) => {
    const details = output.append('details');
    details.append('summary').text(`${result.request.type} returned at ${d3.timeFormat('%H:%M:%S.%L')(new Date())}`);
    details.append('pre').text(JSON.stringify(result, null, 2));
  });

  button.on('click', () => {
    const message = JSON.parse((textarea as any).node().value);
    api.send(message);
  });

  // initialize the client/ session
  api.init(INIT);
});
