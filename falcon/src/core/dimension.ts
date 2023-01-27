import type { BinConfig, Interval } from "./util";

interface AbstractDimension {
  type: string;
  name: string;
}

export interface ContinuousDimension extends AbstractDimension {
  /* continuous range of values */
  type: "continuous";

  /* max number of bins to create, the result could be less bins */
  bins: number;

  /* expected bin resolution we need to brush over*/
  resolution: number;

  /* [min, max] interval to count between */
  extent?: ContinuousRange;

  /* binConfig determines the bin scheme */
  binConfig?: BinConfig;
}
export interface CategoricalDimension extends AbstractDimension {
  /* categorical values */
  type: "categorical";

  /**
   * possible values to look at, blank if just use all
   * @todo change this to an exclude or what to include
   */
  extent?: CategoricalRange;
}

export type Dimension = ContinuousDimension | CategoricalDimension;
export type ContinuousRange = Interval<number>;
export type CategoricalRange = any[];
export type DimensionFilter = ContinuousRange | CategoricalRange;
