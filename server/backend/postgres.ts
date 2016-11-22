/// <reference path='../../node_modules/pg-promise/typescript/pg-promise.d.ts' />

import * as pgp from 'pg-promise';

const config = require('../../config.json');

const SQL_QUERY = `
  SELECT width_bucket("$1:raw", $2, $3, $4) as bucket, count(*) 
  FROM ${config.database.table} 
  WHERE $5:raw 
  GROUP BY bucket order by bucket asc;
`;

class Postgres {
  db: any;
  
  constructor(connection) {
    this.db = pgp({})(connection);
  }

  private formatPredicate(predicate: {dimension: string, range: Range}) {
    const { range, dimension } = predicate;
    return `${range[0]} < "${dimension}" and "${dimension}" < ${range[1]}`; 
  }

  query(dimension: string, predicates: [{dimension: string, range: Range}]) {
    const range = config.dimensions[dimension].range;
    return this.db.many({
      name: 'postgres-bucket-query', // This tells PG to use a prepared statement.
      text: SQL_QUERY,
      values: [dimension, range[0], range[1], config.numBins, predicates.map(this.formatPredicate).join(' and ').trim() || true] 
    });
  }
}


export default Postgres;


