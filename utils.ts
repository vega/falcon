export function isPoint2D(point: Point): point is Point {
  return typeof point !== 'number';
}
