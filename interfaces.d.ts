declare type Range = [number, number];

declare type Request = {
  id: string,
  type: 'init'
} | {
  id: string,
  type: 'preload',
  dimension: string,
  value: number,  
  velocity: number
} | {
  id: string,
  type: 'load',
  dimension: string,
  value: number 
} | {
  id: string,
  type: 'setRange',
  dimension: string,
  range: Range
};


// declare type Result = {
//     // multiple results for the same query
//     id: string,
//     type: 'query',
//     dim: string,
//     data: number[]
// } | {
//     type: 'range',
//     id: string,
//     ranges: {[dim: string]: Rng}
// }
