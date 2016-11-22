/// <reference path="../../interfaces.d.ts" />
/// <reference path='../../node_modules/pg-promise/typescript/pg-promise.d.ts' />

import * as pgp from 'pg-promise';
import { Backend } from '.';

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

  private formatPredicate(predicate: Dimension) {
    const { range, name } = predicate;
    return `${range[0]} < "${name}" and "${name}" < ${range[1]}`; 
  }

  public query(dimension: string, predicates: Dimension[]) {

    const dim = config.dimensions.find(d => d.name === dimension);
    const range = dim.range;
    predicates.push(dim);

    const variables = [
      dimension, 
      range[0], 
      range[1], 
      dim.bins, 
      predicates.map(this.formatPredicate).join(' and ').trim() || true
    ];

    return this.db.many(SQL_QUERY, variables);
  }
}


export default Postgres;


