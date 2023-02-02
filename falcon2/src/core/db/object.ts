import { ArrowDB } from "./arrow";
import { Table, tableFromArrays, tableFromJSON } from "apache-arrow";

type ColumnarObject = Parameters<typeof tableFromArrays>[0];
type RowObject = Parameters<typeof tableFromJSON>[0];
export type ObjectInput = ColumnarObject | RowObject;

function isColumnar(obj: ObjectInput) {
  return !Array.isArray(obj);
}

export class ObjectDB extends ArrowDB {
  /**
   * Input a columnar object {item: [1, 2], item2: ["a", "b"], ...}
   * or a row object [{item: 1, item2: "a"}, {item: 2, item2: "b"}]
   */
  constructor(object: ColumnarObject | RowObject) {
    let arrowTable: Table;
    if (isColumnar(object)) {
      arrowTable = tableFromArrays(object as unknown as ColumnarObject);
    } else {
      arrowTable = tableFromJSON(object as unknown as RowObject);
    }
    super(arrowTable);
  }
}
