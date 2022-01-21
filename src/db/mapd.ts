import MapdCon from "@mapd/connector";
import { Table } from "apache-arrow";
import { compactQuery } from "../util";
import { SQLDB } from "./sql";

const connector = new MapdCon();

export class MapDDB<V extends string, D extends string> extends SQLDB<V, D> {
  private session: any;

  constructor(
    private readonly conn: {
      host: string;
      db: string;
      user: string;
      password: string;
      protocol: "http" | "https";
      port: number;
    },
    table: string,
    nameMap?: Map<D, string>
  ) {
    super(table, nameMap);
  }

  public async initialize() {
    const connection = connector
      .protocol(this.conn.protocol)
      .host(this.conn.host)
      .port(this.conn.port)
      .dbName(this.conn.db)
      .user(this.conn.user)
      .password(this.conn.password);

    this.session = await connection.connectAsync();
  }

  protected castBins(input: number) {
    return `cast(${input} as float)`;
  }

  protected async query(q: string): Promise<Table> {
    const t0 = performance.now();

    const {
      results,
      timing
      // fields
    } = await this.session.queryDFAsync(q, {
      returnTiming: true
    });

    q = compactQuery(q);

    console.info(
      `%c${q}`,
      "color: #bbb",
      "\nRows:",
      results.length,
      "Execution time:",
      timing.execution_time_ms,
      "ms. With network:",
      performance.now() - t0,
      "ms."
    );

    return results;
  }
}
