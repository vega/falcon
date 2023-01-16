import { NdArray } from "ndarray";

import type { View, View1D } from "../views";
import type { Dimension } from "../dimension";
import type { Interval } from "../util";

export type ArrayType = NdArray;
export interface IndexContainer {
  hists: NdArray;
  noBrush: NdArray;
}
export type SyncIndex = Map<View, IndexContainer>;
export type AsyncIndex = Map<View, Promise<IndexContainer>>;
export type Index = SyncIndex | AsyncIndex;
export type AsyncOrSync<T> = Promise<T> | T;
export type DimensionFilters = Map<string, Interval<number>>;

export interface FalconDB {
  load1DAll(view: View1D, filters?: DimensionFilters): AsyncOrSync<ArrayType>;
  load1DIndex(
    activeView: View1D,
    passiveViews: View[],
    filters?: DimensionFilters
  ): Index;
  extent(dimension: Dimension): AsyncOrSync<Interval<number>>;
  length(): AsyncOrSync<number>;
}
