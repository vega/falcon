export function isPoint2D(point: Point): point is Point2D {
  return typeof point !== 'number';
}

export function isPoint1D(point: Point): point is Point1D {
  return typeof point === 'number';
}

export function is1DView(view: View): view is View1D {
  return 'range' in view;
}

export function stepSize(range: [number, number], bins: number) {
  return (range[1] - range[0]) / bins;
}

export function clamp(i: number, range: [number, number]) {
  return Math.max(range[0], Math.min(range[1], i));
}
