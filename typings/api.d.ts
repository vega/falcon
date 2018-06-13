type Histogram = Uint32Array; // | number[][];
type ResultSlice = Map<string, Histogram>;
type ResultCube = Map<string, Histogram[]>;

/**
 * Views
 */
interface AbstractView {
  /** The name of the view. Can be used as an identifier. */
  name: string;
  /** Title for axis. Should not be used as an identifier. */
  title?: string;
}

interface View1D extends AbstractView {
  type: "1D";
  /** The dimensions for this view. */
  dimension: string;
  /** Initial domain for the dimension. */
  extent: Interval<number>;
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: number;
}

interface View2D extends AbstractView {
  type: "2D";
  /** The dimensions for this view. */
  dimensions: [string, string];
  /** Initial domains for the dimensions. */
  domains: [Interval<number>, Interval<number>];
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: [number, number];
}

type View = View1D | View2D;

interface BinConfig {
  start: number;
  stop: number;
  step: number;
}
