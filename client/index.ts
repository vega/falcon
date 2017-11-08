import * as d3 from 'd3';
import * as vega from 'vega';

import { views } from '../shared/config';
import { is1DView, stepSize } from '../shared/util';
import API from './api';
import connection from './ws';

const vegaViews = {};

const element = document.querySelector('#view')!;

let api: API;

for (const view of views) {
  let vgSpec;

  if (is1DView(view)) {
    const step = stepSize(view.range, view.bins);
    const bins = d3.range(view.range[0], view.range[1] + step, step);

    vgSpec = {
      $schema: 'https://vega.github.io/schema/vega/v3.0.json',
      autosize: 'pad',
      padding: 5,
      width: 600,
      height: 180,
      data: [
        {name: 'table'},
      ],
      signals: [
        { name: 'xmove', value: 0,
          on: [{events: 'window:mousemove', update: 'x()'}],
        },
        { name: 'extent', value: view.range },
        { name: 'range', update: 'extent',
          on: [
            {
              events: {signal: 'zoom'},
              update: '[clamp((range[0]+range[1])/2 - zoom, extent[0], extent[1]), clamp((range[0]+range[1])/2 + zoom, extent[0], extent[1])]',
            },
            {
              events: '@chart:dblclick!, @brush:dblclick!',
              update: '[extent[0], extent[1]]',
            },
            {
              events: '[@brush:mousedown, window:mouseup] > window:mousemove!',
              update: '[range[0] + invert("x", x()) - invert("x", xmove), range[1] + invert("x", x()) - invert("x", xmove)]',
            },
            {
              events: '[@chart:mousedown, window:mouseup] > window:mousemove!',
              update: '[min(anchor, invert("x", x())), max(anchor, invert("x", x()))]',
            },
          ],
        },
        { name: 'zoom', value: 0,
          on: [{
            events: '@chart:wheel!, @brush:wheel!',
            update: '0.5 * abs(span(range)) * pow(1.0005, event.deltaY * pow(16, event.deltaMode))',
          }],
        },
        { name: 'anchor', value: 0,
          on: [{
            events: '@chart:mousedown!',
            update: 'invert("x", x())'},
          ],
        },
      ],
      marks: [
        {
          type: 'group',
          name: 'chart',
          encode: {
            enter: {
              height: {signal: 'height'},
              width: {signal: 'width'},
              clip: {value: true},
              fill: {value: 'transparent'},
            },
          },
          marks: [
            {
              type: 'rect',
              name: 'brush',
              encode: {
                enter: {
                  y: {value: 0},
                  height: {field: {group: 'height'}},
                  fill: {value: '#000'},
                  opacity: {value: 0.07},
                },
                update: {
                  x: {signal: 'scale("x", range[0])'},
                  x2: {signal: 'scale("x", range[1])'},
                },
              },
            },
            {
              name: 'marks',
              type: 'rect',
              interactive: false,
              from: {data: 'table'},
              encode: {
                update: {
                  x2: {
                    scale: 'x',
                    field: 'value',
                    offset: 1,
                  },
                  x: {scale: 'x', field: 'value_end'},
                  y: {scale: 'y', field: 'count'},
                  y2: {scale: 'y', value: 0},
                  fill: {value: '#4c78a8'},  // darker blue
                },
              },
            },
            {
              type: 'rect',
              interactive: false,
              encode: {
                enter: {
                  y: {value: 0},
                  height: {field: {group: 'height'}},
                  fill: {value: 'firebrick'},
                },
                update: {
                  x: {signal: 'max(1, scale("x", range[0]))'},
                  width: {value: 1},
                },
              },
            },
            {
              type: 'rect',
              interactive: false,
              encode: {
                enter: {
                  y: {value: 0},
                  height: {field: {group: 'height'}},
                  fill: {value: 'firebrick'},
                },
                update: {
                  x: {signal: 'min(width - 1, scale("x", range[1]))'},
                  width: {value: 1},
                },
              },
            },
          ],
        },
      ],
      scales: [
        {
          name: 'x',
          type: 'linear',
          domain: view.range,
          range: 'width',
          zero: false,
        },
        {
          name: 'y',
          type: 'linear',
          domain: {data: 'table', field: 'count'},
          range: 'height',
          nice: true,
          zero: true,
        },
      ],
      axes: [
        {
          scale: 'x',
          orient: 'bottom',
          labelOverlap: true,
          tickCount: {signal: 'ceil(width/20)'},
          title: view.title,
          values: bins,
        },
        {
          scale: 'y',
          orient: 'left',
          labelOverlap: true,
          tickCount: {signal: 'ceil(height/40)'},
          title: 'Count',
          grid: true,
          encode: {
            grid: {
              update: {
                stroke: {value: '#ddd'},
              },
            },
          },
        },
      ],
      config: {axisY: {minExtent: 30}},
    };
  } else {
    // TODO
    continue;
  }

  const runtime = vega.parse(vgSpec);

  const el = element.appendChild(window.document.createElement('div'));

  const vegaView = new vega.View(runtime)
    .logLevel(vega.Warn)
    .initialize(el)
    .renderer('svg')
    .run();

  vegaView.addSignalListener('range', (name, value) => {
    api.send({
      requestId: 0,
      type: 'preload',
      activeViewName: view.name,
      activeViewType: '1D',
      indexes: value,
      range: [0, 1],
      views,
      velocity: 0,
      acceleration: 0,
      pixel: 1,
    });
  });

  vegaViews[view.name] = vegaView;
}

connection.onOpen(() => {
  console.info('Intialized connection...');

  // initialize
  api = new API(connection);

  const sizes = {};
  for (const view of views) {
    if (is1DView(view)) {
      sizes[view.name] = 600;
    }
  }

  api.send({
    type: 'init',
    sizes,
  });

  api.onResult( result => {
    for (const view of views) {
      if (is1DView(view)) {
        const results = result.data[view.name];

        if (results) {
          const step = stepSize(view.range, view.bins);
          const bins = d3.range(view.range[0], view.range[1] + step, step);

          const data = bins.map((bin, i) => ({
            value: bin,
            value_end: bin + step,
            count: results[i],
          }));

          const changeSet = vega.changeset().remove(() => true).insert(data);
          if (view.name in vegaViews) {
            vegaViews[view.name].change('table', changeSet).run();
          }
        }
      }
    }
  });

  // window.setInterval(() => {
  //   for (const view of views) {
  //     if (is1DView(view)) {
  //       const step = stepSize(view.range, view.bins);
  //       const bins = d3.range(view.range[0], view.range[1] + step, step);

  //       const data = d3.histogram()
  //         .domain(view.range)
  //         .thresholds(bins.slice(0, bins.length - 1))(d3.range(100).map(() => view.range[0] + d3.randomBates(10)() * step * view.bins))
  //         .map((d, i) => ({
  //           value: bins[i],
  //           value_end: bins[i + 1],
  //           count: d.length,
  //         }));

  //       const changeSet = vega.changeset().remove(() => true).insert(data);
  //       vegaViews[view.name].change('table', changeSet).run();
  //     } else {
  //       // TODO
  //       continue;
  //     }
  //   }
  // }, 1000);
});
