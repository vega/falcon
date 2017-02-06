import * as pgp from 'pg-promise';
import * as d3 from 'd3';
import { Backend, Predicate } from '.';

import * as config from '../../config';

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

  private getPredicateVars(predicates: Predicate[]) {
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

  public query(dimension: string, predicates: Predicate[]) {
    const dim = config.dimensions.find(d => d.name === dimension);
    const range = dim.range;

    const wherePredicate = predicates.reduce(this.reducePredicates, {currentPredicate: '', varCount: 4});

    const SQL_QUERY = `
      SELECT width_bucket("${dim.name}", $1, $2, $3) as bucket, count(*)
      FROM ${config.database.table}
      WHERE ${wherePredicate.currentPredicate}
      GROUP BY bucket order by bucket asc;
    `;

    let variables = [
      range[0],
      range[1],
      dim.bins
    ];

    variables = variables.concat(this.getPredicateVars(predicates));

    const queryConfig: {text: string, values: number[], name?: string} = {
      text: SQL_QUERY,
      values: variables
    };

    if (config.optimizations.preparedStatements) {
      queryConfig.name = `${dimension}-${wherePredicate.varCount}`;
    }

    return this.db
      .many(queryConfig)
      .then((results: {bucket: number, count: number}[]) => {
        const r = d3.range(dim.bins + 1).map(() => 0);
        results.forEach((d) => {
          r[+d.bucket] = +d.count;
          if (+d.bucket === 0) {
            r[0] = 0;
          }
        });
        return r;
      })
      .catch((err: Error) => {
        console.log(err);
        return d3.range(dim.bins + 1).map(() => 0);

      });

  }
}


export default Postgres;


