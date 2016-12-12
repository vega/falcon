import BrushableBar from './viz/brushable-bar';
import * as d3 from 'd3';
import * as config from '../config';

const vizs: {[dimension: string]: BrushableBar} = {};
const dimensions = config.dimensions;
const CHART_WIDTH = 600;
const CHART_HEIGHT = 250;

const serialize = (obj) => {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
};

let currentRequest = null;
const handleBrushEnd = (dimension: Dimension) => {
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
      .get((err, d) => {
        // Set the data for each of the charts
        if (err) {
          console.error(err);
          return;
        }

        const response = JSON.parse(d.response);
        Object.keys(response).forEach((dimension) => {
          vizs[dimension].update(response[dimension], 0);
        });
      });
  };
};

// Initialize empty charts
dimensions.forEach(dim => {
  const chart = new BrushableBar(dim, {width: CHART_WIDTH, height: CHART_HEIGHT});
  chart.onBrush('end', handleBrushEnd(dim));
  vizs[dim.name] = chart;
});

// Initialize with resolutions
let initParams = {};
dimensions.forEach((d) => {
  initParams[d.name] = vizs[d.name].contentWidth;
});

// Send HTTP request with init parameters 
d3.request('/init?' + serialize(initParams))
  .get((err, d) => {
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
