import * as d3 from 'd3';
import * as config from '../../config';

function rand() {
  return Math.round(Math.random() * 1000);
}

export default class Random implements Backend {
  public async query(queryConfig: QueryConfig): Promise<ResultData> {
    const data: ResultData = {};

    queryConfig.views.forEach(view => {
      if (view.type === '1D') {
        data[view.name] = d3.range(config.viewIndex[view.name].bins as number).map(() => rand());
      } else {
        const v = config.viewIndex[view.name] as View2D;
        data[v.name] = d3.range(v.bins[0]).map(() => d3.range(v.bins[1]).map(() => rand()));
      }
    });

    const results = new Promise<ResultData>((resolve, rejext) => {
      resolve(data);
    });

    return results;
  }
}
