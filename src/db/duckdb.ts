import * as duckdb from "@duckdb/duckdb-wasm";
import { compactQuery } from "../util";
import { SQLDB } from "./sql";

export class DuckDB<V extends string, D extends string> extends SQLDB<V, D> {
  private db: duckdb.AsyncDuckDB;

  constructor(private dataUrl: string, nameMap?: Map<D, string>) {
    super("data", nameMap);
  }

  public async initialize() {
    console.log("Initialize DuckDB and create view for parquet file.");

    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    const worker = await duckdb.createWorker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();

    this.db = new duckdb.AsyncDuckDB(logger, worker);

    await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    const c = await this.db.connect();
    await c.query(
      `CREATE VIEW '${this.table}' AS SELECT * FROM parquet_scan('${this.dataUrl}')`
    );
    const info = await c.query(`PRAGMA table_info('${this.table}')`);
    console.table((info.toArray() as any).map(Object.fromEntries));

    c.close();
  }

  protected async query(q: string) {
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

    return results as any;
  }
}
