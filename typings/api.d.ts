
/**
 * Load data with maximum priority and cannot be cancelled.
 */
interface Load {
  type: 'load'
  activeView: View
  views: View[]
}

type Sizes = {[view: string]: Point}

/**
 * Initialize the app.
 */
interface Init {
  type: 'init'
  sizes: Sizes
  views: View[]
}

declare type ApiRequest = Init | Load

type ApiResult = {
  request: Init
  stepSize: number
  // view -> hist
  data: ResultSlice
} | {
  request: Load
  // view -> index -> hist
  data: ResultCube
}

type Histogram = number[]; // | number[][];
type ResultSlice = {[key: string]: Histogram}
type ResultCube = {[view: string]: Histogram[]};

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
  type: '1D'
  /** The dimensions for this view. */
  dimension: string
  /** Range for the dimensions. */
  range: Interval<number>
  brush?: Interval<number>
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: number
}

interface View2D extends AbstractView {
  type: '2D'
  /** The dimensions for this view. */
  dimensions: [string, string]
  /** Initial range for the dimensions. */
  ranges: [Interval<number>, Interval<number>]
  brushes?: [Interval<number>, Interval<number>]
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: [number, number]
}

type View = View1D; // | View2D;
