import * as duckdb from "@duckdb/duckdb-wasm";
import { compactQuery } from "../util";
import { SQLDB } from "./sql";

export class DuckDB<V extends string, D extends string> extends SQLDB<V, D> {
  constructor(private db: duckdb.AsyncDuckDB, nameMap?: Map<D, string>) {
    super("data", nameMap);
  }
  public initialize(): void {}
  public async fromUrl(url: string) {
    console.log("Initialize DuckDB and create view for parquet file.");

    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const worker = await duckdb.createWorker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();

    this.db = new duckdb.AsyncDuckDB(logger, worker);

    await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    const c = await this.db.connect();
    await c.query(
      `CREATE VIEW '${this.table}' AS SELECT * FROM parquet_scan('${url}')`
    );
    const info = await c.query(`PRAGMA table_info('${this.table}')`);
    console.table((info.toArray() as any).map(Object.fromEntries));

    c.close();
  }

  protected async query(q: string): Promise<any> {
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
}

export async function duckdbFromParquet(url: string, table = "data") {
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const worker = await duckdb.createWorker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();

  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  const c = await db.connect();
  await c.query(
    `CREATE VIEW '${table}' AS SELECT * FROM parquet_scan('${url}')`
  );
  const info = await c.query(`PRAGMA table_info('${table}')`);
  console.table((info.toArray() as any).map(Object.fromEntries));

  c.close();
  return db;
}
