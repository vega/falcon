type Histogram = Uint32Array; // | number[][];
type ResultCube<V> = Map<V, Histogram[]>;

/**
 * Views
 */
interface AbstractView {
  /** Title for axis. Should not be used as an identifier. */
  title?: string;
}

interface View1D<D> extends AbstractView {
  type: "1D";
  /** The dimensions for this view. */
  dimension: D;
  /** Initial domain for the dimension. */
  extent: Interval<number>;
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: number;
  /** Current configuration of bins. */
  binConfig?: BinConfig;
}

interface View2D<D> extends AbstractView {
  type: "2D";
  /** The dimensions for this view. */
  dimensions: [D, D];
  /** Initial domains for the dimensions. */
  extents: [Interval<number>, Interval<number>];
  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: [number, number];
  /** Current configuration of bins. */
  binConfigs?: [BinConfig, BinConfig];
}

type View<D> = View1D<D> | View2D<D>;

/**
 * Map from view name to view. The name can be used as an identifier.
 */
type Views<T, D> = Map<T, View<D>>;
interface BinConfig {
  start: number;
  stop: number;
  step: number;
}

type DataArray = Array<number> | Uint32Array | Uint16Array | Uint8Array;
