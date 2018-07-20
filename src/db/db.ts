import ndarray from "ndarray";
import { Dimension, View1D, View2D, Views } from "../api";
import { Interval } from "../basic";

export type DbResult<V> = Map<
  V,
  {
    hists: ndarray;
    noBrush: ndarray;
  }
>;

export interface DB<V extends string, D extends string> {
  length(): number;
  histogram(dimension: Dimension<D>): ndarray;
  heatmap(dimensions: [Dimension<D>, Dimension<D>]): ndarray;

  loadData1D(
    activeView: View1D<D>,
    pixels: number,
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ): DbResult<V>;

  loadData2D(
    activeView: View2D<D>,
    pixels: [number, number],
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ): DbResult<V>;
}
