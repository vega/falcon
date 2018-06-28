// from https://github.com/rmnoon/ts-bitset with modifications

export class BitSet {
  private _buffer: Uint32Array;
  private _size: number = 0;

  constructor(size: number, buffer?: ArrayBuffer) {
    if (buffer) {
      this.setFromBuffer(buffer, size);
    } else {
      this.setSize(size);
    }
  }

  check(idx: number): boolean {
    return (this._buffer[elemIdx(idx)] & (1 << bitPlace(idx))) !== 0; // tslint:disable-line
  }

  set(idx: number, val: boolean): void {
    const existing = this.check(idx);
    if (val === existing) return;
    if (val) {
      this._buffer[elemIdx(idx)] |= 1 << bitPlace(idx); // tslint:disable-line
    } else {
      this._buffer[elemIdx(idx)] &= ~(1 << bitPlace(idx)); // tslint:disable-line
    }
  }

  setAll(val: boolean): void {
    if (val) {
      // don't overfill the last element in case we grow (we'd be wrong)
      const numOverhang = this._size % PER_ELEM_BITS;
      if (numOverhang === 0) {
        // no overhang
        fill(this._buffer, FULL_ELEM);
      } else {
        // fill up to overhang, write last elem manually
        fill(this._buffer, FULL_ELEM, this._buffer.length - 1);
        this._buffer[this._buffer.length - 1] = (1 << numOverhang) - 1; // tslint:disable-line
      }
    } else {
      fill(this._buffer, 0);
    }
  }

  get size(): number {
    return this._size;
  }

  setSize(newSize: number) {
    if (newSize === this._size) return;
    this._size = newSize;
    const oldBuf = this._buffer;
    const newBuf = (this._buffer = new Uint32Array(numElemsNeeded(newSize)));
    if (oldBuf) {
      if (newBuf.length < oldBuf.length) {
        newBuf.set(oldBuf.subarray(0, newBuf.length));

        // clear any bits above the overhang
        const numOverhang = newSize % PER_ELEM_BITS;
        if (numOverhang > 0) {
          newBuf[newBuf.length - 1] &= (1 << numOverhang) - 1; // tslint:disable-line
        }
      } else {
        // we grew, no need to recompute num true, just copy
        newBuf.set(oldBuf);
      }
    } else {
      // fresh array
    }
  }

  get buffer(): ArrayBuffer {
    return this._buffer.buffer as ArrayBuffer;
  }

  union(other: BitSet) {
    const size = this._size;
    const numElems = numElemsNeeded(size);
    for (let i = 0; i < numElems; i++) {
      this._buffer[i] = this._buffer[i] | other.buffer[i];
    }
  }

  setFromBuffer(buffer: ArrayBuffer, size: number) {
    this._buffer = new Uint32Array(buffer);
    this._size = size;
  }
}

const PER_ELEM_BITS = 8 * Uint32Array.BYTES_PER_ELEMENT;
const FULL_ELEM = 0xffffffff;

function elemIdx(bitIdx: number) {
  return Math.floor(bitIdx / PER_ELEM_BITS);
}

function bitPlace(bitIdx: number) {
  return bitIdx % PER_ELEM_BITS;
}

function numElemsNeeded(size: number) {
  return Math.ceil(size / PER_ELEM_BITS);
}

/**
 * Compute the union of all bit sets. The sets need to have the same length.
 */
export function union(...sets: BitSet[]): BitSet | null {
  if (sets.length == 0) {
    return null;
  }

  // copy of first set
  const out = new BitSet(sets[0].size, sets[0].buffer);

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    out.union(set);
  }

  return out;
}

export function numOn(buf: Uint32Array | ArrayBuffer, size: number): number {
  let sum = 0;
  const numElems = numElemsNeeded(size);
  const numOverhang = size % PER_ELEM_BITS;
  for (let i = 0; i < numElems; i++) {
    if (i === numElems - 1 && numOverhang > 0) {
      sum += popcount(buf[i], numOverhang);
    } else {
      sum += popcount(buf[i]);
    }
  }
  return sum;
}

function popcount(anInt: number, topBitPlaceToStart?: number) {
  if (topBitPlaceToStart !== undefined) {
    anInt &= (1 << topBitPlaceToStart) - 1; // tslint:disable-line
  }

  anInt -= (anInt >> 1) & 0x55555555; // tslint:disable-line
  anInt = (anInt & 0x33333333) + ((anInt >> 2) & 0x33333333); // tslint:disable-line
  anInt = (anInt + (anInt >> 4)) & 0x0f0f0f0f; // tslint:disable-line
  anInt += anInt >> 8; // tslint:disable-line
  anInt += anInt >> 16; // tslint:disable-line
  return anInt & 0x7f; // tslint:disable-line
}

// world's jankiest polyfill
function fill(arr: Uint32Array, val: number, len = arr.length): void {
  if (arr.fill) {
    arr.fill(val, 0, len);
    return;
  }
  for (let i = 0; i < len; i++) {
    arr[i] = val;
  }
}
