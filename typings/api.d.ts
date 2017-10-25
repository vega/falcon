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
