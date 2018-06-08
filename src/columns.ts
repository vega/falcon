export function rows2Columns(data) {
  return Object.assign(
    {},
    ...Object.keys(data[0]).map(key => ({ [key]: data.map(o => o[key]) }))
  );
}
