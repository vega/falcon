import type { BitSet } from "./bitset";
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
    private numRows: number,
    private rowGetter: (index: number) => Row | null,
    private mask?: BitSet | null,
    public offset: number = 0,
    public length: number = Infinity
  ) {}

  *bitmaskRows() {
    let globalIndex = 0;
    while (globalIndex < this.numRows) {
      const row = this.rowGetter(globalIndex);
      if (this.mask) {
        if (!this.mask.get(globalIndex)) {
          yield row as Row;
        }
      } else {
        yield row as Row;
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
