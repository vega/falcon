
/**
 * Requests
 */

/**
 * Load data with maximum priority and cannot be cancelled.
 */
interface Load {
  type: 'load'
  activeView: View
  /** In the active dimension, get the data until here. In data domain. */
  index: Point
  /**
   * Views for which we want data including their extents.
   * Usually this will be all views except for the active view but it may be only one if we are zooming in or out and need new data.
   **/
  views: View[]
}

/**
 * Load data around this query.
 */
interface AbstractPreload<T extends Point>{
  /** Identifier for this request. */
  requestId: number,
  type: 'preload',
  /** Like index value in load but can be multiple values. */
  indexes: T[]
  /** Velocity in pixels per ms. */
  velocity: T,
  /** Acceleration in pixel domain. */
  acceleration: T;
  /**
   * Views for which we want data including their extents.
   **/
  views: View[]
}

interface Preload1D extends AbstractPreload<Point1D> {
  activeView: View1D
}

interface Preload2D extends AbstractPreload<Point2D> {
  activeView: View2D
}

type Preload = Preload1D | Preload2D

type Sizes = {[view: string]: Point}

type Stats = {[view: string]: {
  mean: number,
  median: number
}}

/**
 * Initialize the app.
 */
interface Init {
  type: 'init',
  sizes: Sizes
}

interface Profile {
  type: 'profile',
  /** Timing stats for each view. */
  stats: Stats
}

declare type ApiRequest = Init | Preload | Load | Profile

/**
 * Responses
 */

interface Result {
  query: QueryConfig
  /** The data for each view. */
  data: ResultData
}

type ResultRow = number[] | number[][];

declare type ResultData = {[view: string]: ResultRow}

/**
 * Views
 */

interface AbstractView {
  /** The name of the view. Can be used as an identifier. */
  name: string
  /** Title for axis. Should not be used as an identifier. */
  title?: string
}

interface View1D extends AbstractView {
  type: '1D';
  /** The dimensions for this view. */
  dimension: string
  /** Range for the dimensions. */
  range: Interval<number>
  brush?: Interval<number>
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: number
}

interface View2D extends AbstractView {
  type: '2D';
  /** The dimensions for this view. */
  dimensions: [string, string]
  /** Initial range for the dimensions. */
  ranges: [Interval<number>, Interval<number>]
  brushes?: [Interval<number>, Interval<number>]
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: [number, number]
}

type View = View1D | View2D;
