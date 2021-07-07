import { Table } from "apache-arrow";
import { compactQuery } from "../util";
import { SQLDB } from "./sql";

export class HTTPDB<V extends string, D extends string> extends SQLDB<V, D> {
  public readonly blocking: boolean = false;

  constructor(
    private readonly url: string,
    table: string,
    nameMap?: Map<D, string>,
    private readonly escapeQuery: (query: string) => string = encodeURIComponent
  ) {
    super(table, nameMap);
  }

  public async initialize() {}

  protected async query(q: string): Promise<Table> {
    const t0 = performance.now();

    const table = await Table.fromAsync(
      fetch(`${this.url}${this.escapeQuery(q)}`)
    );

    console.info(
      `%c${compactQuery(q)}`,
      "color: #bbb",
      "\nRows:",
      table.length,
      "Query time:",
      performance.now() - t0,
      "ms."
    );

    return table;
  }
}
