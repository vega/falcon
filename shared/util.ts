export const EPSILON = 1e-15;

export function isPoint1D(point: Point1D | Point2D): point is Point1D {
  return typeof point === 'number';
}

export function isPoint2D(point: Point1D | Point2D): point is Point2D {
  return typeof point !== 'number';
}

export function is1DView(view: View1D | View2D): view is View1D {
  return 'range' in view;
}

export function stepSize(range: [number, number], bins: number) {
  return (range[1] - range[0]) / bins;
}

export function clamp(i: number, range: [number, number]) {
  return Math.max(range[0], Math.min(range[1], i));
}

export function binningFunc(range: [number, number], bins: number) {
  const step = stepSize(range, bins);
  return (v: number) => Math.floor((v - range[0]) / step + EPSILON);
}
