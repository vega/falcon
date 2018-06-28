/**
 * Views
 */
interface AbstractView {
  /** Title for axis. Should not be used as an identifier. */
  title?: string;
}

/**
 * A sigle dimension of a view.
 */
interface Dimension<D> {
  /** The name of the dimension. */
  name: D;

  /** Initial domain for the dimension. */
  extent: Interval<number>;

  /** D3 Format specifier */
  format: string;

  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: number;

  /** Current configuration of bins. */
  binConfig?: BinConfig;
}

interface View1D<D extends string> extends AbstractView {
  type: "1D";

  /** The dimension for this view. */
  dimension: Dimension<D>;
}

interface View2D<D extends string> extends AbstractView {
  type: "2D";

  /** The dimensions for this view. */
  dimensions: [Dimension<D>, Dimension<D>];
}

type View<D extends string> = View1D<D> | View2D<D>;

/**
 * Map from view name to view. The name can be used as an identifier.
 */
type Views<V extends string, D extends string> = Map<V, View<D>>;

/**
 * Binning configuration.
 */
interface BinConfig {
  start: number;
  stop: number;
  step: number;
}
type DataArray = Array<number> | Uint32Array | Uint16Array | Uint8Array;
