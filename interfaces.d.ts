declare type Interval = [number, number];

declare type Request = {
  type: 'init'
} | {
  type: 'preload',
  dimension: string,
  value: number,  
  velocity: number
} | {
  type: 'load',
  dimension: string,
  value: number 
} | {
  type: 'setRange',
  dimension: string,
  range: Interval
};

declare type Dimension = {
  name: string,
  range: Interval,
  title?: string,
  bins?: number
};

declare type Result = {
  dimension: string,
  data: { bucket: number, value: number }[]
};
