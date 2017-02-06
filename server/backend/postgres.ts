import * as pgp from 'pg-promise';
import * as d3 from 'd3';
import * as utils from '../../utils';

import * as config from '../../config';

type Predicate = (BrushRange | QueryDimension) & {name: string};
type QueryPredicate = QueryDimension & {name: string};

class Postgres implements Backend {
  private db: any;

  constructor(connection: pgp.TConnectionOptions) {
    this.db = pgp({})(connection);
  }

  private reducePredicates(accumulator: {currentPredicate: string, varCount: number}, predicate: Predicate, index: number) {
    let { currentPredicate, varCount } = accumulator;
    if (index !== 0) {
      currentPredicate += ' and ';
    }

    const { lower, upper, name } = predicate;
    if (lower !== undefined && upper !== undefined) {
      currentPredicate += `$${varCount++} < "${name}" and "${name}" < $${varCount++}`;
    } else if (lower !== undefined) {
      currentPredicate += `$${varCount++} < "${name}"`;
    } else if (upper !== undefined) {
      currentPredicate += `"${name}" < $${varCount++}`;
    }

    return {
      currentPredicate,
      varCount
    };
  }

  private getPredicateVars(predicates: AbstractRange[]) {
    const vars: number[] = [];
    predicates.forEach((predicate) => {
      const { lower, upper } = predicate;
      if (lower !== undefined && upper !== undefined) {
        vars.push(lower);
        vars.push(upper);
      } else if (lower !== undefined) {
        vars.push(lower);
      } else if (upper !== undefined) {
        vars.push(upper);
      }
    });
    return vars;
  }

  private async queryOne(dimension: QueryPredicate, predicates: Predicate[]): Promise<ResultRow> {
    const wherePredicate = predicates.reduce(this.reducePredicates, {currentPredicate: '', varCount: 4});

    const SQL_QUERY = `
      SELECT width_bucket("${dimension.name}", $1, $2, $3) as bucket, count(*)
      FROM ${config.database.table}
      ${predicates.length > 0 ? `WHERE  ${wherePredicate.currentPredicate}` : ''}
      GROUP BY bucket order by bucket asc;
    `;

    let variables = [
      dimension.range[0],
      dimension.range[1],
      dimension.bins
    ];

    variables = variables.concat(this.getPredicateVars(predicates));

    const queryConfig: {text: string, values: number[], name?: string} = {
      text: SQL_QUERY,
      values: variables
    };

    if (config.optimizations.preparedStatements) {
      const hashCode = function(s){
        return s.split('').reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
      }
      queryConfig.name = hashCode(SQL_QUERY);
    }

    return this.db
      .many(queryConfig)
      .then((results: {bucket: number, count: number}[]) => {
        const r = d3.range(dimension.bins + 1).map(() => 0);
        results.forEach((d) => {
          r[+d.bucket] = +d.count;
          if (+d.bucket === 0) {
            r[0] = 0;
          }
        });
        return r;
      })
      .catch((err: Error) => {
        console.warn(err);
        return d3.range(dimension.bins + 1).map(() => 0);
      });
  }

  /**
   * Runs multiple async queries and returns a promise for all resutlts.
   */
  public async query(dimensions: QueryConfig) {
    const predicates: Predicate[] = utils.objectMap(dimensions, (d: BrushRange | QueryDimension, name) => {
      return {
        name,
        ...d
      }
    });

    // which dimensions do we want to query
    const queryPredicates = predicates.filter(dim => dim.query) as QueryPredicate[];
    const queue = queryPredicates.map(dim => this.queryOne(
        dim,
        // don't add predicate for the dimension we want the data for
        // also filter all predicates that do nothing
        predicates.filter(d => d.name !== dim.name && d.upper !== undefined)
      ));

    const pgResults = await Promise.all(queue);

    let results: ResultData = {};
    queryPredicates.forEach((d, i) => {
      results[d.name] = pgResults[i];
    })

    return results;
  }
}


export default Postgres;


