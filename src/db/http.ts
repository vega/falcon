import { Table } from "apache-arrow";
import { SQLDB } from "./sql";

export class HTTPDB<V extends string, D extends string> extends SQLDB<V, D> {
  public readonly blocking: boolean = false;

  constructor(
    private readonly url: string,
    table: string,
    nameMap: Map<D, string>
  ) {
    super(table, nameMap);
  }

  public async initialize() {}

  protected async query(q: string): Promise<Table> {
    const t0 = performance.now();

    q = q.replace(/\s\s+/g, " ").trim();

    const results = await Table.fromAsync(fetch(`${this.url}${q}`));

    console.info(
      `%c${q}`,
      "color: #bbb",
      "\nRows:",
      results.length,
      "Query time:",
      performance.now() - t0,
      "ms."
    );

    return results;
  }
}
