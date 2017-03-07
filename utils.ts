import { isArray } from 'util';
export function isPoint2D(point: Point): point is Point2D {
  return typeof point !== 'number';
}

export function isPoint1D(point: Point): point is Point1D {
  return typeof point === 'number';
}

export function is2D(data: ResultRow): data is number[][] {
  return isArray(data[0]);
}

export function is1D(data: ResultRow): data is number[] {
  return !is2D(data);
}
