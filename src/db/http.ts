import { Table } from "apache-arrow";
import { SQLDB } from "./sql";

function replaceSpaces(str: string): string {
  return str.replace(/\s+/g, " ");
}

export class HTTPDB<V extends string, D extends string> extends SQLDB<V, D> {
  public readonly blocking: boolean = false;

  constructor(
    private readonly url: string,
    private readonly escapeQuery: (query: string) => string = replaceSpaces,
    table: string,
    nameMap: Map<D, string>
  ) {
    super(table, nameMap);
  }

  public async initialize() {}

  protected async query(q: string): Promise<Table> {
    const t0 = performance.now();

    const results = await Table.fromAsync(
      fetch(`${this.url}${this.escapeQuery(q)}`)
    );

    console.info(
      `%c${replaceSpaces(q)}`,
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
