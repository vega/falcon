import type { BitSet } from "./bitset";
import type { Table } from "apache-arrow";
import type { TypedArray } from "./falconArray/arrayTypes";

export type Instances = Record<string, unknown[]>;
export type Indices = TypedArray;

interface InstancesInputAbstract {
  offset: number;
  length: number;
}

export type InstancesInput = InstancesInputAbstract;
export type Row = Record<string, any>;

export class RowIterator {
  constructor(
    private table: Table,
    private mask?: BitSet | null,
    public offset: number = 0,
    public length: number = Infinity
  ) {
    this.table = table;
    this.mask = mask;
    this.length = length;
    this.offset = offset;
  }

  *bitmaskRows() {
    let globalIndex = 0;
    while (globalIndex < this.table.numRows) {
      const row = this.table.get(globalIndex);
      if (this.mask) {
        if (this.mask && !this.mask.get(globalIndex)) {
          yield row as Row;
        }
      }
      globalIndex++;
    }
  }

  *[Symbol.iterator]() {
    let lengthCount = 0;
    let offsetCount = 0;

    for (const row of this.bitmaskRows()) {
      const lengthExceeded = lengthCount >= this.length;
      if (lengthExceeded) {
        break;
      }
      const pastOffset = offsetCount >= this.offset;
      if (pastOffset) {
        lengthCount++;
        yield row;
      }
      offsetCount++;
    }
  }
}
