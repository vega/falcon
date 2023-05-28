import type { BinConfig, Interval } from "./util";

interface AbstractDimension {
  type: string;
  name: string;
}

export interface ContinuousDimension extends AbstractDimension {
  /* continuous range of values */
  type: "continuous";

  /* expected bin resolution we need to brush over*/
  resolution: number;

  /* number of bins to create, the bins computed might be more or less than this number */
  bins?: number;

  /* forces bins to be exactly, and not fudged around for nicer intervals 
  default is false 
  */
  exact?: boolean;

  /* [min, max] interval to count between */
  range?: ContinuousRange;

  /* binConfig determines the bin scheme */
  binConfig?: BinConfig;

  /* should format for dates */
  time?: boolean;
}
export interface CategoricalDimension extends AbstractDimension {
  /* categorical values */
  type: "categorical";

  /**
   * possible values to look at, blank if just use all
   * @todo change this to an exclude or what to include
   */
  range?: CategoricalRange;
}

export type Dimension = ContinuousDimension | CategoricalDimension;
export type ContinuousRange = Interval<number>;
export type CategoricalRange = any[];
export type DimensionFilter = ContinuousRange | CategoricalRange;

export type KeyRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type KeyOptional<T, K extends keyof T> = T & Partial<Pick<T, K>>;
