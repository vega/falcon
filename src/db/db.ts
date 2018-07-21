import ndarray from "ndarray";
import { Dimension, View1D, View2D, Views } from "../api";
import { Interval } from "../basic";

export type DbResult<V> = Map<
  V,
  {
    hists: ndarray;
    noBrush: Promise<ndarray> | ndarray;
  }
>;

export interface DataBase<V extends string, D extends string> {
  initialize(): Promise<void> | void;
  length(): Promise<number> | number;
  histogram(dimension: Dimension<D>): Promise<ndarray> | ndarray;
  heatmap(dimensions: [Dimension<D>, Dimension<D>]): Promise<ndarray> | ndarray;

  loadData1D(
    activeView: View1D<D>,
    pixels: number,
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ): Promise<DbResult<V>> | DbResult<V>;

  loadData2D(
    activeView: View2D<D>,
    pixels: [number, number],
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ): Promise<DbResult<V>> | DbResult<V>;
}
