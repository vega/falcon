export const EPSILON = 1e-15;

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

export function throttle<A extends (...args: any[]) => any>(
  func: A,
  timeout: number
): A {
  let inThrottle;

  return function(this: any, ...args: any[]) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        return (inThrottle = false);
      }, timeout);
    }
  } as any;
}

export function duplicate<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}
