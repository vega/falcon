import { ArrowDB } from "./arrow";
import { tableFromArrays } from "apache-arrow";

type ColumnarArray = Parameters<typeof tableFromArrays>[0];

export class ArrayDB extends ArrowDB<string, string> {
  constructor(array: ColumnarArray) {
    super(tableFromArrays(array));
  }
}
