/**
 * A map of intervals for multiple dimensions that tells us the brush configuration.
 */
declare type Brushes = {[dimension: string]: Interval}

/**
 * Dimensions to get data for and the ranges for which we want data.
 * We we zoom in, the range changes.
 */
declare type DimensionRanges = { [dimension: string]: Interval};

interface AbstractLoad {
  /** Dimension for which the index is valid. This is usually the dimension which the user is interacting with.  */
  activeDimension: string,
  /**
   * Dimensions for which we want data including their extents.
   * Usually this will be all dimensions but it may be only one if we are zooming in or out and need new data.
   **/
  dimensions: DimensionRanges,
  /** Brushed ranges in other dimensions. */
  brushes: Brushes
}

/**
 * Load data with maximum priority and cannot be cancelled.
 */
interface Load extends AbstractLoad {
  type: 'load',
  /** In the active dimension, get the data until here. */
  index: number,
}

/**
 * Load data around this query.
 */
interface Preload extends AbstractLoad {
  type: 'preload',
  /** Like value in preload but can be multiple values. */
  indexes: number[],
  /** Velocity in pixels per ms. */
  velocity: number
}

declare type Request = {
  type: 'init'
} | Preload | Load;

interface Dimension {
  /** The name of the dimension. */
  name: string,
  /** Initial range for the dimension. */
  range: Interval,
  /** Title for exis titles. */
  title?: string,
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins?: number
}

interface Result {
  /** The active dimension for this result */
  activeDimension: string,
  /** The end value for the upper range in the active dimension */
  index: number,
  /** The brushes we used to compute the query result */
  brushes: Brushes,
  /** The data for each dimension. */
  data: ResultData,
}

declare interface ResultRow {
  range: Interval,
  values: number[],
}

declare type ResultData = {[dimension: string]: ResultRow}
