import connection from './ws';
import API from './api';
import * as d3 from 'd3';

import * as config from '../config';

// const views = config.views;
const views = config.views.filter(v => v.type === '1D');

let sizes: Sizes = {};
views.forEach((view) => {
  sizes[view.name] = view.type === '1D' ? 500 : [500, 300];
});

const INIT: Init = {
  type: 'init',
  sizes
};


const active = 'ARR_DELAY';

/*
const MESSAGE: Load = {
  type: 'load',
  index: 10,
  activeView: {... views.find(v => v.name === active) as View1D, pixel: 500},
  views: views.filter(v => v.name !== active).map(v => {
    return {
      query: true,
      ...v
    };
  })
};
/*/
const MESSAGE: Preload = {
  type: 'preload',
  requestId: 0,
  indexes: [-5, 20],
  velocity: 10,
  acceleration: 0,
  activeView: {... views.find(v => v.name === active) as View1D, pixel: 500},
  views: views.filter(v => v.name !== active).map(v => {
    return {
      query: true,
      ...v
    };
  })
};
// */

const div = d3.select('body').append('div');

const textarea = div.append('textarea').style('display', 'block').style('height', '500px').style('width', '700px').text(JSON.stringify(MESSAGE, null, 2));
const button = div.append('button').style('margin', '8px 0').style('font-size', '1.4em').text('Send request');
const output = div.append('div').style('font-size', '0.9em');

const api = new API(connection);

connection.onOpen(() => {
  output.append('p').text('Socket initialized');

  api.onResult((result) => {
    const details = output.append('details');
    const av = result.query.activeView;
    details.append('summary').text(`request with data for ${av && av.name} ${result.query.index} returned at ${d3.timeFormat('%H:%M:%S.%L')(new Date())}`);
    details.append('pre').text(JSON.stringify(result, null, 2));
  });

  button.on('click', () => {
    const message = JSON.parse((textarea as any).node().value);
    api.send(message);
  });

  // initialize the client/ session
  api.send(INIT);
});
