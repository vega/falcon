// from https://github.com/mikolalysenko/minimal-bit-array/blob/master/bitarray.js with modifications

export class BitSet {
  private _bits: Uint32Array;

  constructor(public readonly length: number, bits?: Uint32Array) {
    this._bits = bits || new Uint32Array((length >>> 5) + 1);
  }

  public get(i: number) {
    i |= 0;
    return !!(this._bits[i >>> 5] & (1 << (i & 31)));
  }

  public get bits() {
    return this._bits;
  }

  public set(i: number, v: boolean) {
    i |= 0;
    var idx = i >>> 5;
    var bit = 1 << (i & 31);
    if (v) {
      this._bits[idx] |= bit;
    } else {
      this._bits[idx] &= ~bit;
    }

    return this;
  }

  public union(other: BitSet) {
    for (let i = 0; i < this._bits.length; i++) {
      this._bits[i] = this._bits[i] | other._bits[i];
    }
  }
}

/**
 * Compute the union of all bit sets. The sets need to have the same length.
 * If you only pass in a single bit set, this function will not make a copy.
 */
export function union(...sets: BitSet[]): BitSet | null {
  if (sets.length == 0) {
    return null;
  }

  if (sets.length == 1) {
    return sets[0];
  }

  // copy of first set
  const out = new BitSet(sets[0].length, new Uint32Array(sets[0].bits));

  for (let i = 1; i < sets.length; i++) {
    const set = sets[i];
    out.union(set);
  }

  return out;
}
