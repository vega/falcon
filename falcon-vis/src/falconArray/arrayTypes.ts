// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
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
 * Float32Array kept having bad floating point addition errors and making the counts bad
 * Float64Array is larger, but is accurate
 * I've also tried doing UInt32Array, but it has a max value of 4B which is not ideal, but memory effecient.

 * @TODO consider checking how large their data is and opting to use UInt32Array if it's small enough
 */
export const CumulativeCountsArray = Float64Array;
export type CumulativeCountsArrayType = Float64Array;

/**
 * These are just the raw counts, not the aggregate/cumulative counts.
 * But the limit on 32bit is still a problem at large data sizes.
 *
 * @TODO consider checking how large their data is and opting to use UInt32Array if it's small enough
 */
export const CountsArray = Float64Array;
export type CountsArrayType = Float64Array;
