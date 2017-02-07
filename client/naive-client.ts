import BrushableBar from './viz/brushable-bar';
import * as d3 from 'd3';
import * as config from '../config';

const vizs: {[dimension: string]: BrushableBar} = {};
const views = config.views;
const CHART_WIDTH = 600;
const CHART_HEIGHT = 250;

const serialize = (obj: {[key: string]: string}) => {
  var str = [];
  for(var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
    }
  }
  return str.join('&');
};

let currentRequest: d3.Request = null;
const handleBrushEnd = (dimension: View) => {
  return () => {
    if (currentRequest) {
      currentRequest.abort();
    }
    const viz = vizs[dimension.name];
    const s = d3.event.selection || viz.x.range();
    const extent = (s.map(viz.x.invert, viz.x));

    // Send HTTP request with range parameter
    const params = {
      dimension: dimension.name,
      lower: extent[0],
      upper: extent[1]
    };

    currentRequest = d3.request('/loadRange?' + serialize(params))
      .get((err: Error, d: any) => {
        // Set the data for each of the charts
        if (err) {
          console.error(err);
          return;
        }

        const response = JSON.parse(d.response);
        Object.keys(response).forEach((dim) => {
          vizs[dim].update(response[dim], 0);
        });
      });
  };
};

// Initialize empty charts
views.forEach(view => {
  const chart = new BrushableBar(view as View1D, {width: CHART_WIDTH, height: CHART_HEIGHT});
  chart.onBrush('end', handleBrushEnd(view));
  vizs[view.name] = chart;
});

// Initialize with resolutions
let initParams: any = {};
views.forEach(v => {
  initParams[v.name] = vizs[v.name].contentWidth;
});

// Send HTTP request with init parameters
d3.request('/init?' + serialize(initParams))
  .get((err: Error, d: any) => {
    // Set the initial data for each of the charts
    if (err) {
      console.error(err);
      return;
    }

    const response = JSON.parse(d.response);
    Object.keys(response).forEach((dimension) => {
      vizs[dimension].update(response[dimension], 0);
    });
  });
