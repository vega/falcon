import { viewIndex } from '../../config';
import * as pgp from 'pg-promise';
import * as d3 from 'd3';
import * as utils from '../../utils';

import * as config from '../../config';

class Postgres implements Backend {
  private db: pgp.IDatabase<any>;

  constructor(connection: pgp.TConnectionOptions) {
    this.db = pgp({})(connection);
  }

  public static where(_var: (value: number) => void, name: string, lower?: number, upper?: number) {
    if (lower !== undefined && upper !== undefined) {
      return `$${_var(lower)} < "${name}" and "${name}" < $${_var(upper)}`;
    } else if (lower !== undefined) {
      return `$${_var(lower)} < "${name}"`;
    } else if (upper !== undefined) {
      return `"${name}" < $${_var(upper)}`;
    }
    return undefined;
  }

  public static buildQuery(view: ViewQuery, queryConfig: QueryConfig) {
    let wherePredicate: string[] = [];
    let values: number[] = [];

    let binning = '';
    let group;

    // creates a new variable and collects the values
    function _var(value: number) {
      values.push(value);
      return values.length;
    };

    const _where = (name: string, lower?: number, upper?: number) => {
      const w = Postgres.where(_var, name, lower, upper);
      if (w) {
        wherePredicate.push(w);
      }
    };

    if (!(view.name in viewIndex)) {
      console.error('Unknown view', view.name);
      return null;
    }

    if (view.type === '1D') {
      const v = viewIndex[view.name] as View1D;
      values = [
        view.range[0],
        view.range[1],
        v.bins
      ];
      binning = `width_bucket("${v.dimension}", $1, $2, $3) as bucket`;
      group = `bucket`;
      _where(v.dimension, view.range[0], view.range[1]);
    } else {
      const v = viewIndex[view.name] as View2D;
      values = [
        view.ranges[0][0],
        view.ranges[0][1],
        v.bins[0],
        view.ranges[0][0],
        view.ranges[0][1],
        v.bins[1]
      ];
      binning = `width_bucket("${v.dimensions[0]}", $1, $2, $3) as bucket1, width_bucket("${v.dimensions[1]}", $4, $5, $6) as bucket2`;
      group = `bucket1, bucket2`;
      _where(v.dimensions[0], view.ranges[0][0], view.ranges[0][1]);
      _where(v.dimensions[1], view.ranges[1][0], view.ranges[1][1]);
    }

    // where clause for active view
    if (queryConfig.activeView && queryConfig.index) {
      const idx = queryConfig.index;
      if (utils.isPoint2D(idx)) {
        const v = viewIndex[queryConfig.activeView.name] as View2D;
        _where(v.dimensions[0], undefined, idx[0]);
        _where(v.dimensions[1], undefined, idx[1]);
      } else {
        const v = viewIndex[queryConfig.activeView.name] as View1D;
        _where(v.dimension, undefined, idx);
      }
    }

    queryConfig.views.forEach(vq => {
      if (vq.name === view.name) {
        return;
      }

      if (vq.type === '1D' && vq.brush) {
        const v = viewIndex[vq.name] as View1D;
        _where(v.dimension, vq.brush[0], vq.brush[1]);
      } else if (vq.type === '2D' && vq.brushes) {
        const v = viewIndex[vq.name] as View2D;
        _where(v.dimensions[0], vq.brushes[0][0], vq.brushes[0][1]);
        _where(v.dimensions[1], vq.brushes[1][0], vq.brushes[1][1]);
      }
    });

    const SQL_QUERY = `
      SELECT ${binning}, count(*)
      FROM ${config.database.table}
      ${wherePredicate.length > 0 ? `WHERE  ${wherePredicate.join(' and ')}` : ''}
      GROUP BY ${group} ORDER BY ${group} asc;
    `;

    return {
      text: SQL_QUERY,
      values
    } as {text: string, values: number[], name?: string};
  }

  private async queryOne(view: ViewQuery, queryConfig: QueryConfig): Promise<ResultRow> {
    const query = Postgres.buildQuery(view, queryConfig);

    if (query === null) {
      return [];
    }

    if (config.optimizations.preparedStatements) {
      const hashCode = function(s: string) {
        return s.split('').reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a;},0);
      };
      query.name = '' + hashCode(query.text);
    }

    const callback = (results: any[]) => {
      if (view.type === '1D') {
        const res = results as {bucket: string, count: string}[];
        const r = d3.range(config.viewIndex[view.name].bins as number).map(() => 0);
        res.forEach((d) => {
          r[+d.bucket] = +d.count;
        });
        return r;
      } else {
        const res = results as {bucket1: string, bucket2: string, count: string}[];
        const v = config.viewIndex[view.name] as View2D;
        const r = d3.range(v.bins[0]).map(() => d3.range(v.bins[1]).map(() => 0));
        res.forEach((d) => {
          r[+d.bucket1][+d.bucket2] = +d.count;
        });
        return r;
      }
    };

    return this.db
      .many(query)
      .then(callback)
      .catch((err: Error) => {
        console.warn(err);

        // return 0s
        if (view.type === '1D') {
          return d3.range(config.viewIndex[view.name].bins as number + 1).map(() => 0);
        } else {
          const v = config.viewIndex[view.name] as View2D;
          return d3.range(v.bins[0] + 1).map(() => d3.range(v.bins[1] + 1).map(() => 0));
        }
      });
  }

  /**
   * Runs multiple async queries and returns a promise for all results.
   */
  public async query(queryConfig: QueryConfig): Promise<ResultData> {
    const viewsToQuery = queryConfig.views.filter(view => view.query);
    const queue = viewsToQuery.map(view => this.queryOne(
        view,
        queryConfig
      ));

    const pgResults = await Promise.all(queue);

    let results: ResultData = {};
    viewsToQuery.forEach((d, i) => {
      results[d.name] = pgResults[i];
    });

    return results;
  }
}

export default Postgres;
