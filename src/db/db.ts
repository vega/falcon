import ndarray from "ndarray";
import { Dimension, View1D, View2D, Views } from "../api";
import { Interval } from "../basic";

export interface Hists {
  hists: ndarray;
  noBrush: ndarray;
}

export type SyncIndex<V> = Map<V, Hists>;
export type AsyncIndex<V> = Map<V, Promise<Hists>>;
export type Index<V> = SyncIndex<V> | AsyncIndex<V>;

export type Hist = {
  hist: ndarray;
  noBrush: ndarray;
};

export interface DataBase<V extends string, D extends string> {
  initialize(): Promise<void> | void;

  /** Are database requests blocking or asyncronous. */
  readonly blocking: boolean;

  length(): Promise<number> | number;
  histogram(
    dimension: Dimension<D>,
    brushes?: Map<D, Interval<number>>
  ): Promise<Hist> | Hist;
  heatmap(dimensions: [Dimension<D>, Dimension<D>]): Promise<ndarray> | ndarray;

  loadData1D(
    activeView: View1D<D>,
    pixels: number,
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ): Index<V>;

  loadData2D(
    activeView: View2D<D>,
    pixels: [number, number],
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ): Index<V>;

  getDimensionExtent(dimension: Dimension<D>): Interval<number>;
}
