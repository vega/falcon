import HeavyaiCon from "@heavyai/connector";
import { compactQuery } from "../util";
import { SQLDB } from "./sql";
import type { SQLNameMap, SQLQuery } from "./sql";
import type { Dimension } from "../dimension";

const connector = new HeavyaiCon();

export class HeavyaiDB extends SQLDB {
  private session: any;

  constructor(session: any, table: string, nameMap?: SQLNameMap) {
    super(table, nameMap);
    this.session = session;
  }

  static async connectSession(
    conn: {
      host: string;
      dbName: string;
      user: string;
      password: string;
      protocol: "http" | "https";
      port: number | string;
    },
    table: string,
    nameMap?: SQLNameMap
  ) {
    const connection = connector
      .protocol(conn.protocol)
      .host(conn.host)
      .port(conn.port)
      .dbName(conn.dbName)
      .user(conn.user)
      .password(conn.password);

    const session = await connection.connectAsync();

    return new HeavyaiDB(session, table, nameMap);
  }

  protected castBins(input: number) {
    return `cast(${input} as float)`;
  }

  castTime(name: string) {
    return `extract(epoch from ${name}) * 1000`;
  }

  async dimensionExists(_: Dimension) {
    /**
     * @todo figure out in heavyai sql how to do this
     */
    return true;
  }

  async tableExists() {
    /**
     * @todo figure out in heavyai sql how to do this
     */
    return true;
  }

  protected async query(q: SQLQuery) {
    const t0 = performance.now();

    const {
      results,
      timing,
      // fields
    } = await this.session.queryDFAsync(q, {
      returnTiming: true,
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
