import { Table } from "apache-arrow";
import { compactQuery } from "../util";
import { SQLDB } from "./sql";
import type { SQLNameMap } from "./sql";

export class HTTPDB extends SQLDB {
  public readonly blocking: boolean = false;

  constructor(
    private readonly url: string,
    table: string,
    nameMap?: SQLNameMap,
    private readonly escapeQuery: (query: string) => string = encodeURIComponent
  ) {
    super(table, nameMap);
  }

  protected async query(q: string): Promise<Table> {
    const t0 = performance.now();

    //@ts-ignore
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
