/**
 * [Great Scott!](https://www.youtube.com/watch?v=LXboNl2vWH8)
 * straight up taken from [d3](https://github.com/d3/d3-array/blob/main/src/threshold/scott.js#L2)
 * thank you mike
 */
export function greatScott(
  min: number,
  max: number,
  standardDeviation: number
) {
  return Math.ceil((max - min) / (3.49 * standardDeviation));
}
