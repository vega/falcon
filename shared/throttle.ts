export function throttle<A extends (...args: any[]) => any>(func: A, timeout: number): A {
  let inThrottle;

  return function(this: any, ...args: any[]) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        return inThrottle = false;
      }, timeout);
    }
  } as any;
}
