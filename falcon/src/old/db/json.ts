import { ArrowDB } from "./arrow";
import { tableFromArrays } from "apache-arrow";

type ColumnarJSON<D extends string> = { [key in D]: any };

export class ObjectDB<V extends string, D extends string> extends ArrowDB<
  V,
  D
> {
  constructor(columnar: ColumnarJSON<D>) {
    const arrowTable = tableFromArrays(columnar);
    super(arrowTable);
  }
}
