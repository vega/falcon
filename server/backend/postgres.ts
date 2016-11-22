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

const c = {
  database: 'postgres',
  host: 'localhost', // Server hosting the postgres database
  port: 5432  // env var: PGPORT
};

class Postgres implements Backend {
  db: any;
  
  constructor(connection) {
    this.db = pgp({})(c);
  }

  private formatPredicate(predicate: Dimension) {
    const { range, name } = predicate;
    return `${range[0]} < "${name}" and "${name}" < ${range[1]}`; 
  }

  query(dimension: string, predicates: Dimension[]) {

    const dim = config.dimensions.find(d => d.name === dimension);
    const range = dim.range;

    const variables = [
      dimension, 
      range[0], 
      range[1], 
      dim.bins, 
      predicates.map(this.formatPredicate).join(' and ').trim() || true
    ];

    console.log(variables);

    return this.db.many(SQL_QUERY, variables).catch(console.log);
  }
}


export default Postgres;


