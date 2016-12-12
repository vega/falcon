declare type Interval = [number, number];

declare type Request = {
  type: 'init',
  resolutions: { dimension: string, value: number }[]
} | {
  type: 'preload',
  dimension: string,
  value: number | number[],
  velocity: number
} | {
  type: 'load',
  dimension: string,
  value: number
} | {
  type: 'loadInterval',
  dimenstion: string,
  // We use two numbers
  // instead of an interval here
  // to make it easier for HTTP 
  // requests. This is only used
  // for testing the baseline.
  lower: number,
  upper: number
} | {
  type: 'setRange',
  dimension: string,
  range: Interval
};

declare type Dimension = {
  name: string,
  range: Interval,
  title?: string,
  bins?: number,
  currentRange?: Interval
};

declare type Result = {
  // the active dimension at the time of sending this
  activeDimension: string,
  // the dimension for which we send the data
  dimension: string,
  // the values for the dimension
  data: number[],
  // the end value for the range in the active dimension
  index: number
};
