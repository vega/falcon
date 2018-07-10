import { View as VgView } from "vega";

/**
 * Views
 */
interface AbstractView {
  /** Title for axis. Should not be used as an identifier. */
  title?: string;

  /** The html element to attach the view to. If null, the view will be ignored. */
  el?: HTMLElement | null;
}

/**
 * A sigle dimension of a view.
 */
interface Dimension<D> {
  /** The name of the dimension. */
  name: D;

  /** A title for the dimension */
  title?: string;

  /** Initial domain for the dimension. */
  extent: Interval<number>;

  /** D3 Format specifier */
  format: string;

  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: number;

  /** Current configuration of bins. */
  binConfig?: BinConfig;
}

interface View0D extends AbstractView {
  type: "0D";
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

type View<D extends string> = View0D | View1D<D> | View2D<D>;

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

interface Logger<V extends string> {
  /**
   * Attach logging to the Vega view.
   */
  attach(name: V, view: VgView): void;

  /**
   * Returns whether the logger has not flushed all logs yet.
   */
  hasUnsentData(): boolean;
}
