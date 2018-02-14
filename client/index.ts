import {range} from 'd3-array';
import * as vega from 'vega';

import { bs } from '../shared/binary-search';
import { views } from '../shared/config';
import { throttle } from '../shared/throttle';
import { is1DView, stepSize } from '../shared/util';
import API from './api';
import connection from './ws';

interface CacheEntry {
  index: number;
  data: number[];
}

interface Cache {[view: string]: CacheEntry[]; }

const CHART_WIDTH = 600;

function createDebugView(element): vega.View {
  const vgSpec = {
    autosize: 'none',
    padding: {top: 5, left: 60, right: 20, bottom: 5},
    width: 600,
    height: 10,
    data: [
      {name: 'points'},
    ],
    scales: [
      {
        name: 'x',
        type: 'linear',
        domain: [0, CHART_WIDTH],
        range: 'width',
        zero: false,
      },
    ],
    marks: [{
      type: 'rect',
      from: {data: 'points'},
      encode: {
        enter: {
          x: {scale: 'x', field: 'index'},
          width: {value: 1},
          height: {signal: 'height'},
          fill: {value: 'steelblue'},
          fillOpacity: {value: 0.4},
        },
      },
    }],
  };

  const runtime = vega.parse(vgSpec);

  const el = element.appendChild(window.document.createElement('div'));

  return new vega.View(runtime)
    .logLevel(vega.Warn)
    .initialize(el)
    .renderer('svg')
    .run();
}

function createView(element, view): vega.View {
  let vgSpec;

  const step = stepSize(view.range, view.bins);
  const bins = range(view.range[0], view.range[1] + step, step);

  vgSpec = {
    $schema: 'https://vega.github.io/schema/vega/v3.0.json',
    autosize: 'none',
    padding: {top: 5, left: 60, right: 60, bottom: 40},
    width: CHART_WIDTH,
    height: 180,
    data: [
      {name: 'table'},
      {
        name: 'sum',
        source: 'table',
        transform: [{
          type: 'aggregate',
          ops: [
            'sum',
          ],
          fields: [
            'count',
          ],
          as: [
            'sum',
          ],
        }],
      },
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
      { name: 'pixelRange', value: [0, {signal: 'width'}],
        on: [{
          events: {signal: 'range'},
          update: '[max(0, scale("x", range[0])), min(scale("x", range[1]), width - 1)]'},
        ],
      },
    ],
    marks: [
      {
        type: 'text',
        from: {data: 'sum'},
        encode: {
          update: {
            x: {signal: 'width', offset: 5},
            y: {value: 10},
            text: {field: 'sum'},
          },
        },
      },
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

  const runtime = vega.parse(vgSpec);

  const el = element.appendChild(window.document.createElement('div'));

  return new vega.View(runtime)
    .logLevel(vega.Warn)
    .initialize(el)
    .renderer('svg')
    .run();
}

/**
 * calculates the diff between two arrays.
 */
function diff(a: number[], b: number[]) {
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = b[i] - a[i];
  }
  return out;
}

const cmp = (a, b) => a.index - b.index;

function absIdx(x: number) {
  if (x >= 0) {
    return x;
  }
  x = -x - 2;
  return x >= 0 ? x : 0;
}

/**
 * Finds the two entries in the cache closest to the indexes.
 */
function keyCacheKeys(cache: CacheEntry[], indexes: [number, number]) {
  if (cache.length === 2) {
    return [0, 0];
  }

  let pos0 = absIdx(bs<Partial<CacheEntry>>(cache, {index: indexes[0]}, cmp));
  let pos1 = absIdx(bs<Partial<CacheEntry>>(cache, {index: indexes[1]}, cmp, pos0, cache.length - 1));

  // make sure that the two indexes are not the same
  if (pos0 === pos1) {
    if (pos0 > 0) {
      pos0--;
    } else {
      pos1++;
    }
  }

  return [pos0, pos1];
}

connection.onOpen(() => {
  console.info('Intialized connection...');

  // standard comparator for cache
  const vegaViews = {};
  const element = document.querySelector('#view')!;
  const api = new API(connection);
  let cache: Cache = {};
  let activeView: View;

  const dbgView = createDebugView(element);

  for (const view of views) {
    const vegaView = createView(element, view);

    if (!vegaView) {
      continue;
    }

    vegaView.addSignalListener('pixelRange', (name: string, value: [number, number]) => {
      const nonActiveViews = views.filter(is1DView).filter(v => v.name !== view.name);

      if (!activeView || view.name !== activeView.name) {
        switchActiveView(view);

        api.send({
          type: 'load',
          activeView: view,
          views: nonActiveViews,
        });
      }

      for (const v of nonActiveViews) {
        const brush = vegaViews[v.name].signal('range');
        if (brush) {
          v.brush = brush;
        }
        if (v.name in cache && cache[v.name].length > 1) {
          const c = cache[v.name];
          const [pos0, pos1] = keyCacheKeys(c, value);
          // console.log(value, pos0, pos1, c[pos0].index, c[pos1].index);
          update(vegaViews[v.name], v, diff(c[pos0].data, c[pos1].data));
        }
      }
    });

    vegaViews[view.name] = vegaView;
  }

  function updateAll() {
    const value = vegaViews[activeView.name].signal('range');

    for (const view of views) {
      const nonActiveViews = views.filter(is1DView).filter(v => v.name !== view.name);
      for (const v of nonActiveViews) {
        const brush = vegaViews[v.name].signal('range');
        if (v.name in cache && cache[v.name].length > 1) {
          const c = cache[v.name];
          const [pos0, pos1] = keyCacheKeys(c, value);
          update(vegaViews[v.name], v, diff(c[pos0].data, c[pos1].data));
        }
      }
    }
  }

  function switchActiveView(newActiveView: View) {
    activeView = newActiveView;
    cache = {};
    dbgView.remove('points', d => true).run();
  }

  function update(vegaView: vega.View, view: View, results: number[]) {
    const step = stepSize(view.range, view.bins);
    const bins = range(view.range[0], view.range[1] + step, step);

    const data = bins.map((bin, i) => ({
      value: bin,
      value_end: bin + step,
      count: results[i],
    }));

    const changeSet = vega.changeset().remove(() => true).insert(data);
    vegaView.change('table', changeSet).run();
  }

  const sizes = {};
  for (const view of views) {
    sizes[view.name] = CHART_WIDTH;
  }

  api.send({
    type: 'init',
    sizes,
    views,
  });

  api.onResult(result => {
    const {request, data} = result;
    if (request.type === 'init') {
      const dataSlice = data as ResultSlice;
      for (const view of request.views) {
        update(vegaViews[view.name], view, dataSlice[view.name]);
      }

    } else if (request.type === 'load') {
      if (request.activeView.name !== activeView.name) {
        console.info('Outdated result.');
        // TODO: requests may be outdated if we zoomed in. check for ranges.
        return;
      }

      // debug view
      const d: any[] = [];
      const res = (data as ResultCube)[request.views[0].name];
      for (let i = 0; i < res.length; i++) {
        if (res[i] !== null) {
          d.push({index: i});
        }
      }
      dbgView.insert('points', d).run();

      for (const view of request.views) {
        const results = (data as ResultCube)[view.name];

        for (let i = 0; i < results.length; i++) {
          const histogram = results[i];

          if (histogram === null) {
            continue;
          }

          const name = view.name;
          const index = i * 1;

          if (!(name in cache)) {
            cache[name] = [];
          }

          const position = bs<Partial<CacheEntry>>(cache[name], {index}, cmp);
          if (position < 0) {
            cache[name].splice(-position - 1, 0, {
              index,
              data: results[index],
            });
          }

        }
      }

      updateAll();
    }
  });
});
