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
          data[view.name] = this.cache[view.name][index];
        } else {
          // TODO
        }
      }
    } else {
      // run queries to get histograms in parallel
      const resolved = await Promise.all(queryConfig.views.filter(view => view.type === '1D').map(view => hist1D(view as View1D, this.pool)));
      resolved.map(res => {
        data[res.name] = res.hist;
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

        const text = `with binned as (
                        select
                          floor(1.0 * ("${this.activeView.name}" - ${this.activeView.range[0]}) / (${this.activeView.range[1]} - ${this.activeView.range[0]}) * ${queryConfig.size}) as activeBucket,
                          floor(1.0 * ("${view.name}" - ${view.range[0]}) / (${view.range[1]} - ${view.range[0]}) * ${view.bins}) as bucket
                        from flights
                        where ${view.range[0]} <= "${view.name}" and "${view.name}" < ${view.range[1]}
                        and ${this.activeView.range[0]} <= "${this.activeView.name}" and "${this.activeView.name}" < ${this.activeView.range[1]}
                      )
                      select activeBucket, bucket, sum(count(*)) over (partition by bucket order by activeBucket) as cnt
                      from binned
                      group by activeBucket, bucket
                      order by activeBucket, bucket`;

        console.log(text);

        const res = await this.pool.query({
          text,
          rowMode: 'array',
        });

        let current = res.rows[0][0];
        let acc: number[] = [];

        for (const row of res.rows) {
          this.cache[view.name][row[0]] = acc;
          if (current !== row[0]) {
            current = row[0];
            acc = [];
          }
          acc[row[1]] = +row[2];
        }
      }
    }
  }
}

async function allHist1D(view: View1D, pool: pg.Pool) {
  const text = `with binned as (
                  select floor("DEP_DELAY"/10)*10 "BIN_DEP_DELAY", floor("ARR_DELAY"/10)*10 "BIN_ARR_DELAY", "DISTANCE"
                  from flights
                  where "DEP_DELAY" is not null and "ARR_DELAY" is not null and "DISTANCE" is not null)
                select "BIN_DEP_DELAY", "BIN_ARR_DELAY", sum(count(*)) OVER (ORDER BY "BIN_DEP_DELAY")
                from binned
                where "DISTANCE" < 2000
                group by "BIN_DEP_DELAY", "BIN_ARR_DELAY"`;
}

/**
 * Get a 1D histogram without any restrictions.
 */
async function hist1D(view: View1D, pool: pg.Pool) {
  const text = `select count(*)
                from flights
                where ${view.range[0]} <= "${view.name}" and "${view.name}" < ${view.range[1]}
                group by floor(1.0 * ("${view.name}" - ${view.range[0]}) / (${view.range[1]} - ${view.range[0]}) * ${view.bins})`;
  const res = await pool.query({
    text,
    rowMode: 'array',
  });

  return {name: view.name, hist: res.rows.map(d => +d[0])};
}

export default Postgres;
