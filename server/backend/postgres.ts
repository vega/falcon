/// <reference path="../../interfaces.d.ts" />
/// <reference path='../../node_modules/pg-promise/typescript/pg-promise.d.ts' />

import * as pgp from 'pg-promise';
import { Backend, Predicate } from '.';

const config = require('../../config.json');

const SQL_QUERY = `
  SELECT width_bucket("$1:raw", $2, $3, $4) as bucket, count(*) 
  FROM ${config.database.table} 
  WHERE $5:raw
  GROUP BY bucket order by bucket asc;
`;

class Postgres implements Backend {
  private db: any;
  
  constructor(connection) {
    this.db = pgp({})(connection);
  }

  private formatPredicate(predicate: Predicate) {
    const { lower, upper, name } = predicate;
    if (lower !== undefined && upper !== undefined) {
      return `${lower} < "${name}" and "${name}" < ${upper}`;
    } else if (lower !== undefined) {
      return `${lower} < "${name}"`;
    } else if (upper !== undefined) {
      return `"${name}" < ${upper}`;
    }
  }

  public query(dimension: string, predicates: Predicate[]) {
    const dim = config.dimensions.find(d => d.name === dimension);
    const range = dim.range;

    const variables = [
      dimension, 
      range[0], 
      range[1], 
      dim.bins, 
      predicates.map(this.formatPredicate).join(' and ').trim() || true
    ];

    return this.db.many(SQL_QUERY, variables).catch(() => {
      console.log('Caught error. Returning empty result set.');
      return [];
    });
  }
}


export default Postgres;


