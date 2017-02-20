/**
 * Requests
 */

interface AbstractLoad {
  /** Dimension for which the index is valid. This is usually the dimension which the user is interacting with.  */
  activeView: string
  /**
   * Views for which we want data including their extents.
   * Usually this will be all views but it may be only one if we are zooming in or out and need new data.
   **/
  views: ViewQuery[]
}

/**
 * Load data with maximum priority and cannot be cancelled.
 */
interface Load extends AbstractLoad {
  type: 'load'
  /** In the active dimension, get the data until here. */
  index: Point
}

/**
 * Load data around this query.
 */
interface Preload extends AbstractLoad {
  type: 'preload'
  /** Like value in preload but can be multiple values. */
  indexes: Point[]
  /** Velocity in pixels per ms. */
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

declare type Request = Init | Preload | Load;

/**
 * Responses
 */

interface Result {
  request: Load | Preload | Init
  /** The data for each view. */
  data: ResultData,
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

