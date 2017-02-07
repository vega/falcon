export function isPoint2D(point: Point): point is Point2D {
  return typeof point !== 'number';
}
