import * as d3 from 'd3';
import * as vega from 'vega';

import { views } from '../shared/config';
import { is1DView, stepSize } from '../shared/util';

const vegaViews = {};

const element = document.querySelector('#view')!;

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
      marks: [
        {
          name: 'marks',
          type: 'rect',
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
              fill: {value: '#4c78a8'},
            },
          },
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
          zindex: 1,
        },
        {
          scale: 'y',
          orient: 'left',
          labelOverlap: true,
          tickCount: {signal: 'ceil(height/40)'},
          title: 'Count',
          zindex: 1,
        },
        {
          scale: 'y',
          orient: 'left',
          domain: false,
          grid: true,
          labels: false,
          maxExtent: 0,
          minExtent: 0,
          tickCount: {signal: 'ceil(height/40)'},
          ticks: false,
          zindex: 0,
          gridScale: 'x',
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

  vegaViews[view.name] = vegaView;
}

window.setInterval(() => {
  for (const view of views) {
    if (is1DView(view)) {
      const step = stepSize(view.range, view.bins);
      const bins = d3.range(view.range[0], view.range[1] + step, step);

      const data = d3.histogram()
        .domain(view.range)
        .thresholds(bins.slice(0, bins.length - 1))(d3.range(100).map(() => view.range[0] + d3.randomBates(10)() * step * view.bins))
        .map((d, i) => ({
          value: bins[i],
          value_end: bins[i + 1],
          count: d.length,
        }));

      const changeSet = vega.changeset().remove(() => true).insert(data);
      vegaViews[view.name].change('table', changeSet).run();
    } else {
      // TODO
      continue;
    }
  }
}, 1000);
