import type { BinConfig } from "../old/api";
import type { Interval } from "../old/basic";

interface AbstractDimension {
  type: string;
  name: string;
}

export interface RangeDimension extends AbstractDimension {
  /* continuous range of values */
  type: "continuous";

  /* max number of bins to create, the result could be less bins */
  bins: number;

  /* expected bin resolution we need to brush over*/
  resolution: number;

  /* [min, max] interval to count between */
  extent?: Interval<number>;

  /* binConfig determines the bin scheme */
  binConfig?: BinConfig;
}

export type Dimension = RangeDimension;
