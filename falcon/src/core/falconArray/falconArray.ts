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

/**
 * abstract away the NdArray reliance and can be swapped out
 * for std lib js for example or vanilla, or tensorflow.js?
 *
 * @resource [PyTorch example of shape, stride, offset](https://www.youtube.com/watch?v=85xBkapaZts)
 */
export class FArray {
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

  decrement(...indices: number[]) {
    this.set(...indices, this.get(...indices) - 1);
  }

  increment(...indices: number[]) {
    this.set(...indices, this.get(...indices) + 1);
  }

  /**
   * this - other = new memory
   */
  sub(other: FArray) {
    const out = new FArray(new Int32Array(this.size), this.shape);
    ops.sub(out.ndarray, this.ndarray, other.ndarray);
    return out;
  }

  /**
   * slice by changing the shape, offset, or stride
   * no new memory created
   */
  slice(...indices: (number | null)[]) {
    const sliced = this.ndarray.pick(...indices);
    return new FArray(this.data, sliced.shape, sliced.stride, sliced.offset);
  }

  /**
   * prefix sum across and up
   */
  cumulativeSum() {
    prefixSum(this.ndarray);
  }
}
