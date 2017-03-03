/**
 * Requests
 */

interface AbstractLoad {
  /** Dimension for which the index is valid. This is usually the dimension which the user is interacting with.  */
  activeView: ActiveView
  /**
   * Views for which we want data including their extents.
   * Usually this will be all views except for the active view but it may be only one if we are zooming in or out and need new data.
   **/
  views: ViewQuery[]
}

type ActiveView = {
  name: string
} & ({
  type: '1D'
  // range to preload in
  range: Interval<number>
  // number of pixels
  dimension: number
} | {
  type: '2D'
  // renages to preload in in x and y
  ranges: [Interval<number>, Interval<number>]
  // number of pixels in x and y dimension
  dimensions: [number, number]
})

/**
 * Load data with maximum priority and cannot be cancelled.
 */
interface Load extends AbstractLoad {
  type: 'load'
  /** In the active dimension, get the data until here. In pixel domain. */
  index: Point
}

/**
 * Load data around this query.
 */
interface Preload extends AbstractLoad {
  type: 'preload'
  /** Like value in preload but can be multiple values. */
  indexes: Point[]
  /** Velocity in units per ms. */
  velocity: Point
}

type Sizes = {[view: string]: number | number[]}

/**
 * Initialize the app. Sets the sizes of the views on the server.
 */
interface Init {
  type: 'init'
  sizes: Sizes
}

declare type ApiRequest = Init | Preload | Load;

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
  /** The name of the view. */
  name: string
  /** Title for exis titles. */
  title?: string
}

interface View1D extends AbstractView {
  type: '1D';
  /** The dimensions for this view. */
  dimension: string
  /** Initial range for the dimensions. */
  range: Interval<number>
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: number
}

interface View2D extends AbstractView {
  type: '2D';
  /** The dimensions for this view. */
  dimensions: [string, string]
  /** Initial range for the dimensions. */
  ranges: [Interval<number>, Interval<number>]
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: [number, number]
}

type View = View1D | View2D;

