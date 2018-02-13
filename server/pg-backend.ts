import * as d3 from 'd3';
import * as pg from 'pg';

import * as config from '../shared/config';
import { binningFunc, is1DView } from '../shared/util';

class Postgres implements Backend {
  private pool: pg.Pool;

  private activeView: View1D;

  private cache: {[view: string]: {[index: number]: number[]}};

  constructor(connection: pg.ConnectionConfig) {
    this.pool = new pg.Pool(connection);
  }

  public async query(queryConfig: QueryConfig): Promise<ResultData> {
    const data: ResultData = {};

    if (queryConfig.activeView) {
      if (queryConfig.activeView.name !== (this.activeView && this.activeView.name)) {
        await this.switchActiveView(queryConfig);
      }

      const binActive = binningFunc(this.activeView.range, queryConfig.size as number);
      const index = binActive(queryConfig.index as number);

      for (const view of queryConfig.views) {
        if (view.type === '1D') {
          data[view.name] = fullHist(this.cache[view.name][index]);
        } else {
          // TODO
        }
      }
    } else {
      // run queries to get histograms in parallel
      const resolved = await Promise.all(queryConfig.views.filter(view => view.type === '1D').map(view => hist1D(view as View1D, this.pool, queryConfig.views.filter(v => v.type === '1D') as any)));
      resolved.map(res => {
        data[res.name] = fullHist(res.hist);
      });
    }

    const results = new Promise<ResultData>((resolve, reject) => {
      resolve(data);
    });

    return results;
  }

  private async switchActiveView(queryConfig: QueryConfig) {
    this.activeView = queryConfig.activeView as View1D;

    // reset the cache
    this.cache = {};

    for (const view of config.views.filter(v => v.name !== this.activeView.name)) {
      if (view.type === '1D') {
        this.cache[view.name] = {};

        // filter for view range or brush for all views except the active view and the current view
        const where = queryConfig.views
          .filter(v => v.name !== view.name)
          .filter(v => v.name !== this.activeView.name)
          .filter(v => v.type === '1D')
          .map((v: View1D) => {
              const range = v.brush || v.range;
              return `${range[0]} <= "${v.name}" and "${v.name}" < ${range[1]}`;
            });

        const text = `with binned as (
                        select
                          floor(1.0 * ("${this.activeView.name}" - ${this.activeView.range[0]}) / (${this.activeView.range[1]} - ${this.activeView.range[0]}) * ${queryConfig.size}) as activeBucket,
                          floor(1.0 * ("${view.name}" - ${view.range[0]}) / (${view.range[1]} - ${view.range[0]}) * ${view.bins}) as bucket
                        from flights
                        where
                          -- only data in the visible range
                          ${view.range[0]} <= "${view.name}" and "${view.name}" < ${view.range[1]}
                          -- other filters
                          ${where.length > 0 ? ' and ' + where.join(' and ') : ''}
                        and ${this.activeView.range[0]} <= "${this.activeView.name}" and "${this.activeView.name}" < ${this.activeView.range[1]}
                      )
                      select activeBucket, bucket, sum(count(*)) over (partition by bucket order by activeBucket) as cnt
                      from binned
                      group by activeBucket, bucket
                      order by activeBucket, bucket`;

        console.info(text);

        const res = await this.pool.query({
          text,
          rowMode: 'array',
        });

        let current = null;
        let acc: number[] = new Array(view.bins);

        for (const row of res.rows) {
          if (current !== row[0]) {
            // set current and create new accumulator
            current = row[0];
            acc = [];
            this.cache[view.name][row[0]] = acc;
          }
          acc[row[1]] = +row[2];
        }
      }
    }
  }
}

/**
 * Get a 1D histogram for the visible ranges at intialization time.
 * The histograms are filtered to the visible range.
 */
async function hist1D(view: View1D, pool: pg.Pool, views: View1D[]) {
  // filter to active range
  const where = views.map(
    v => `${v.range[0]} <= "${v.name}" and "${v.name}" < ${v.range[1]}`).join(' and ');

  const text = `select count(*)
                from flights
                where ${where}
                group by floor(1.0 * ("${view.name}" - ${view.range[0]}) / (${view.range[1]} - ${view.range[0]}) * ${view.bins})`;
  const res = await pool.query({
    text,
    rowMode: 'array',
  });

  return {name: view.name, hist: res.rows.map(d => +d[0])};
}

/**
 * Function to complete a missing accumulative histogram. Histograms may be
 * missing entries but they are needed because the histogram is supposed to be
 * accumulative.
 *
 * this function expects that the histogram is always limited to the current
 * range and thus, the first bucket has to be 0 if the histogram has no value in
 * the first bucket.
 */
function fullHist(hist: number[]) {
  if (!hist) {
    return hist;
  }

  if (hist[0] === undefined) {
    hist[0] = 0;
  }
  for (let i = 1; i < hist.length; i++) {
    if (hist[i] === undefined) {
      hist[i] = hist[i - 1];
    }
  }
  return hist;
}

export default Postgres;
