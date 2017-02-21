export function isPoint2D(point: Point): point is Point2D {
  return typeof point !== 'number';
}

export function isPoint1D(point: Point): point is Point1D {
  return typeof point === 'number';
}
