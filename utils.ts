export function objectMap<T, U>(o: Object, f: (value: U, key: string) => T) {
  return Object.keys(o).map(k => f(o[k], k));
}
