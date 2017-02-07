declare module 'kd.tree' {
  export function createKdTree(a: any[], f:(a: any, b: any) => number, c:any): any
}
