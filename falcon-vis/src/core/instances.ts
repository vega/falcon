import type { BitSet } from "./bitset";
import type { Table } from "apache-arrow";
import type { TypedArray } from "./falconArray/falconArray";

export type Instances = Record<string, unknown[]>;
export type Indices = TypedArray;

interface InstancesInputAbstract {
  offset: number;
  length: number;
}

export type InstancesInput = InstancesInputAbstract;
export type Row = Record<string, any>;

export class ArrowInstances {
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
  *[Symbol.iterator]() {
    let validIterated = 0;
    let globalIndex = 0;
    let ignored = 0;
    while (validIterated < this.length && globalIndex < this.table.numRows) {
      const pastOffset = ignored >= this.offset;
      const row = this.table.get(globalIndex);
      // if we have filters, go into that mode
      if (this.mask) {
        if (this.mask && !this.mask.get(globalIndex)) {
          if (pastOffset) {
            validIterated++;
            yield row;
          }
          ignored++;
        }
        // no filters? yield everything!
      } else {
        yield row;
        validIterated++;
      }
      globalIndex++;
    }
  }
}
