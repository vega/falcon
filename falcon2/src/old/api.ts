import { View as VgView } from "vega";
import { Interval } from "./basic";

/**
 * Views
 */
export interface AbstractView {
  /** The number of dimensions in the view. */
  type: "0D" | "1D" | "2D";

  /** Title for axis. Should not be used as an identifier. */
  title?: string;

  /** The html element to attach the view to. If null, the view will be ignored. */
  el?: HTMLElement | null;
}

/**
 * A sigle dimension of a view.
 */
export interface Dimension<D> {
  /** The name of the dimension. */
  name: D;

  /** A title for the dimension */
  title?: string;

  /** Initial domain for the dimension.  If it's not supplied, will be inferred from the extent of the data. */
  extent?: Interval<number>;

  /** D3 format specifier. If time is true, this has to be a D3 date format. Otherwise it should be a number format. */
  format?: string;
  time?: boolean;

  /** Number of bins for this dimension. We will use this as the resolution at all zoom levels. */
  bins: number;

  /** Current configuration of bins. */
  binConfig?: BinConfig;

  /**
   * The num pixels to compute bins for in the falcon index computation
   * @TODO infer the resolution by the extent and bin config
   */
  resolution: number;
}

export interface View0D extends AbstractView {
  type: "0D";
}

export interface View1D<D extends string> extends AbstractView {
  type: "1D";

  /** The dimension for this view. */
  dimension: Dimension<D>;
}

export interface View2D<D extends string> extends AbstractView {
  type: "2D";
  chartSize?: [number, number];

  /** The dimensions for this view. */
  dimensions: [Dimension<D>, Dimension<D>];
}

export type View<D extends string> = View0D | View1D<D> | View2D<D>;

/**
 * Map from view name to view. The name can be used as an identifier.
 */
export type Views<V extends string, D extends string> = Map<V, View<D>>;

/**
 * Binning configuration.
 */
export interface BinConfig {
  start: number;
  stop: number;
  step: number;
}
export type DataArray = Array<number> | Uint32Array | Uint16Array | Uint8Array;

export interface Logger<V extends string> {
  /**
   * Attach logging to the Vega view.
   */
  attach(name: V, view: VgView): void;
}
