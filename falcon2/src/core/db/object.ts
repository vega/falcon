import { ArrowDB } from "./arrow";
import { tableFromArrays } from "apache-arrow";

type ColumnarObject = { [key in string]: any };

export class ObjectDB extends ArrowDB {
  constructor(columnar: ColumnarObject) {
    const arrowTable = tableFromArrays(columnar);
    super(arrowTable);
  }
}
