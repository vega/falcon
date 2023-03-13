import { compactQuery } from "../util";
import { SQLDB, SQLQueryResult } from "./sql";
import * as duckdb from "@duckdb/duckdb-wasm";
import type { SQLNameMap, SQLQuery } from "./sql";
import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";

export class DuckDB extends SQLDB {
  protected db: AsyncDuckDB;

  /**
   * pass in the duckdb wasm object and the table name
   * you want to look at
   */
  constructor(db: AsyncDuckDB, table: string, nameMap?: SQLNameMap) {
    super(table, nameMap);
    this.db = db;
  }

  /**
   * given a SQL query, query the duckdb database
   *
   * @returns the query results
   */
  protected async query(q: SQLQuery): Promise<SQLQueryResult> {
    const t0 = performance.now();

    q = q.replaceAll("count(*)", "count(*)::INT");

    const c = await this.db.connect();
    const results = await c.query(q);
    c.close();

    q = compactQuery(q);

    console.info(
      `%c${q}`,
      "color: #bbb",
      "\nRows:",
      results.numRows,
      "Execution time:",
      performance.now() - t0,
      "ms."
    );

    return results;
  }

  /**
   * creates new FalconDB instance from this parquet file
   *
   * @returns a new FalconDB
   */
  static async fromParquetFile(
    url: string,
    table = "data",
    nameMap?: SQLNameMap
  ) {
    const db = await createNewTable(
      table,
      `CREATE TABLE '${table}' AS SELECT * FROM parquet_scan('${url}')`
    );
    return new DuckDB(db, table, nameMap);
  }
}

async function createNewTable(table: string, createTableQuery: SQLQuery) {
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const worker = await duckdb.createWorker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();

  const db = new duckdb.AsyncDuckDB(logger, worker);

  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  const c = await db.connect();
  await c.query(createTableQuery);
  const info = await c.query(`PRAGMA table_info('${table}')`);
  console.table((info.toArray() as any).map(Object.fromEntries));

  c.close();

  return db;
}
