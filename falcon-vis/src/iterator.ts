import type { BitSet } from "./bitset";

export type Row = Record<string, any>;

export class RowIterator {
  /**
   * An iterable that yields rows from an arrow like iterator
   * This row iterator also does filtering
   *
   * @param numRows the total number of rows in the
   * @param rowGetter a callback that returns the row at the given row index
   * @param mask a bitset mask that defines which rows to filter out (0 means keep, 1 means filter out)
   * @param offset the number of rows to skip before yielding the first filtered row
   * @param length the number of rows to yield of the filtered rows
   */
  constructor(
    private numRows: number,
    private rowGetter: (index: number) => Row | null,
    private mask?: BitSet | null,
    public offset: number = 0,
    public length: number = Infinity
  ) {}

  /**
   * iterates over all rows where bit is 0 in bitmask
   */
  *filteredRows() {
    const noBitMask = this.mask === null;
    if (noBitMask) {
      // no filters? return all rows obviously!
      for (let i = 0; i < this.numRows; i++) {
        const row = this.rowGetter(i);
        yield row;
      }
    } else {
      // we have filters? then only return rows where bit is 0
      for (let i = 0; i < this.numRows; i++) {
        const row = this.rowGetter(i);
        const keepRow = !this.mask!.get(i);
        if (keepRow) {
          yield row;
        }
      }
    }
  }

  /**
   * iterates over all rows where bit is 0 in bitmask
   * also takes into account offset and length of the filtered rows
   */
  *[Symbol.iterator]() {
    let lengthCount = 0;
    let offsetCount = 0;

    for (const row of this.filteredRows()) {
      // stop if length is exceeded
      const lengthExceeded = lengthCount >= this.length;
      if (lengthExceeded) {
        break;
      }

      // only yield rows after offset
      const pastOffset = offsetCount >= this.offset;
      if (pastOffset) {
        lengthCount++;
        yield row;
      }

      offsetCount++;
    }
  }
}
