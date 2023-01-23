import ndarray from "ndarray";
import prefixSum from "ndarray-prefix-sum";
import type { NdArray } from "ndarray";
import ops from "ndarray-ops";

export type TypedArray =
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | Float32Array
  | Float64Array;

export type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Int16ArrayConstructor
  | Int32ArrayConstructor
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Uint16ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

/**
 * abstract away the NdArray reliance and can be swapped out
 * for std lib js for example or vanilla, or tensorflow.js?
 *
 * @resource [PyTorch example of shape, stride, offset](https://www.youtube.com/watch?v=85xBkapaZts)
 */
export class FalconArray {
  ndarray: NdArray;
  data: TypedArray;

  constructor(
    data: TypedArray,
    shape?: number[],
    stride?: number[],
    offset?: number
  ) {
    this.data = data;
    this.ndarray = ndarray(data, shape, stride, offset);
  }

  get shape() {
    return this.ndarray.shape;
  }

  get offset() {
    return this.ndarray.offset;
  }

  get stride() {
    return this.ndarray.stride;
  }

  get size() {
    return this.ndarray.size;
  }

  set shape(value: number[]) {
    this.ndarray.shape = value;
  }

  set offset(value: number) {
    this.ndarray.offset = value;
  }

  set stride(value: number[]) {
    this.ndarray.stride = value;
  }

  get(...indices: number[]) {
    return this.ndarray.get(...indices);
  }

  set(...indices: number[]) {
    return this.ndarray.set(...indices);
  }

  increment(index: number[], incrementBy = 1) {
    this.set(...index, this.get(...index) + incrementBy);
  }

  /**
   * this - other = new memory
   */
  sub(other: FalconArray) {
    const out = new FalconArray(new Int32Array(this.size), this.shape);
    ops.sub(out.ndarray, this.ndarray, other.ndarray);
    return out;
  }

  /**
   * slice by changing the shape, offset, or stride
   * no new memory created
   */
  slice(...indices: (number | null)[]) {
    const sliced = this.ndarray.pick(...indices);
    return new FalconArray(
      this.data,
      sliced.shape,
      sliced.stride,
      sliced.offset
    );
  }

  /**
   * prefix sum across and up
   */
  cumulativeSum() {
    prefixSum(this.ndarray);

    return this;
  }

  /**
   * @returns FalconArray with typed array
   */
  private static typedArray(
    TypedArray: TypedArrayConstructor,
    length: number,
    shape?: number[],
    stride?: number[],
    offset?: number
  ) {
    const newMemory = new TypedArray(length);
    return new FalconArray(newMemory, shape, stride, offset);
  }

  /**
   * Typed array to store and accumulate values
   * Float for this, but consider other options
   *
   * Namely for the cubes
   *
   * @returns FalconArray with the given length allocated
   */
  static allocCumulative(
    length: number,
    shape?: number[],
    stride?: number[],
    offset?: number
  ) {
    return this.typedArray(Float32Array, length, shape, stride, offset);
  }

  /**
   * Typed array to store integer counts. Namely the histogram bins and counts.
   *
   * @returns FalconArray with the given length allocated
   */
  static allocCounts(
    length: number,
    shape?: number[],
    stride?: number[],
    offset?: number
  ) {
    return this.typedArray(Int32Array, length, shape, stride, offset);
  }
}
