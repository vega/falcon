/// <reference path="../../interfaces.d.ts" />
/// <reference path='../../node_modules/pg-promise/typescript/pg-promise.d.ts' />

import * as pgp from 'pg-promise';
import * as d3 from 'd3';
import { Backend, Predicate } from '.';

const config = require('../../config.json');

class Postgres implements Backend {
  private db: any;
  
  constructor(connection) {
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

  private getPredicateVars(predicates) {
    const vars: any = [];
    predicates.forEach((predicate) => {
      const { lower, upper, name } = predicate;
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

    return this.db
      .many({
        text: SQL_QUERY,
        name: `${dimension}-${wherePredicate.varCount}`,
        values: variables
      })
      .then((results) => {
        const r = d3.range(dim.bins + 1).map(() => 0);
        results.forEach((d) => {
          r[+d.bucket] = +d.count;
        });
        return r;
      })
      .catch((err) => {
        console.log(err);
        // console.log('Caught error. Returning empty result set.');
        return d3.range(dim.bins + 1).map(() => 0);
      });

  }
}


export default Postgres;


