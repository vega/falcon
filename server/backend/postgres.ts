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

  private where(_var: (value: number) => void, name, lower, upper) {
    if (lower !== undefined && upper !== undefined) {
      return `$${_var(lower)} < "${name}" and "${name}" < $${_var(upper)}`;
    } else if (lower !== undefined) {
      return `$${_var(lower)} < "${name}"`;
    } else if (upper !== undefined) {
      return `"${name}" < $${_var(upper)}`;
    }
    return undefined;
  }

  private buildQuery(view: ViewQuery, queryConfig: QueryConfig) {
        let wherePredicate = [];
    let values: number[] = [];

    let binning = '';
    let group;

    // creates a new variable and collects the values
    function _var(value: number) {
      values.push(value);
      return values.length;
    };

    const _where = (name, lower, upper) => {
      const w = this.where(_var, name, lower, upper);
      if (w) {
        wherePredicate.push(w);
      }
    };

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

    queryConfig.views.forEach(vq => {
      if (vq.name === view.name) {
        return;
      }

      if (vq.name === queryConfig.activeView) {
        if (utils.isPoint2D(queryConfig.index)) {
          const v = viewIndex[queryConfig.activeView] as View2D;
          _where(v.dimensions[0], undefined, queryConfig.index[0]);
          _where(v.dimensions[1], undefined, queryConfig.index[1]);
        } else {
          const v = viewIndex[queryConfig.activeView] as View1D;
          _where(v.dimension, undefined, queryConfig.index);
        }
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
    const query = this.buildQuery(view, queryConfig);

    if (config.optimizations.preparedStatements) {
      const hashCode = function(s) {
        return s.split('').reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a;},0);
      };
      query.name = hashCode(query.text);
    }

    return this.db
      .many(query)
      .then((results: any[]) => {
        if (view.type === '1D') {
          const r = d3.range(config.viewIndex[view.name].bins as number + 1).map(() => 0);
          results.forEach((d) => {
            r[+d.bucket] = +d.count;
          });
          return r;
        } else {
          const v = config.viewIndex[view.name] as View2D;
          const r = d3.range(v.bins[0] + 1).map(() => d3.range(v.bins[1] + 1).map(() => 0));
          results.forEach((d) => {
            r[+d.bucket1][+d.bucket2] = +d.count;
          });
          return r;
        }
      })
      .catch((err: Error) => {
        console.warn(err);
        // return d3.range(dimension.bins + 1).map(() => 0);
        return null;
      });
  }

  /**
   * Runs multiple async queries and returns a promise for all resutlts.
   */
  public async query(queryConfig: QueryConfig): Promise<ResultData> {
    const queue = queryConfig.views.filter(view => view.query).map(view => this.queryOne(
        view,
        queryConfig
      ));

    const pgResults = await Promise.all(queue);

    let results: ResultData = {};
    queryConfig.views.forEach((d, i) => {
      results[d.name] = pgResults[i];
    });

    return results;
  }
}

export default Postgres;
