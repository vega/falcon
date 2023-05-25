import { Table, tableFromIPC } from "apache-arrow";
import { compactQuery } from "../util";
import { SQLDB } from "./sql";
import type { SQLNameMap, SQLQuery } from "./sql";

export class HttpDB extends SQLDB {
  public readonly blocking: boolean = false;

  constructor(
    private readonly url: string,
    table: string,
    private readonly encodeGETQuery: (
      query: string
    ) => string = encodeURIComponent,
    nameMap?: SQLNameMap
  ) {
    super(table, nameMap);
  }

  protected async query(q: SQLQuery): Promise<Table> {
    const t0 = performance.now();

    const escapedQuery = this.encodeGETQuery(q);
    /**
     * @todo consider using POST so I don't have to do this encodeURI bs
     */
    const query = await fetch(`${this.url}${escapedQuery}`);
    if (!query.ok) throw new Error(`HTTP ${query.status}: ${query.statusText}`);

    const buffer = await query.arrayBuffer();
    const table = tableFromIPC(buffer);

    console.info(
      `%c${compactQuery(q)}`,
      "color: #bbb",
      "\nRows:",
      table.numRows,
      "Query time:",
      performance.now() - t0,
      "ms."
    );

    return table;
  }
}
