import { ViewAbstract } from "./viewAbstract";
import { binNumberFunctionCategorical, Interval } from "../util";
import type { Falcon } from "../falcon";
import { CategoricalRange } from "../dimension";

/* defines how the parameter is typed for on change */
export interface View0DState {
  total: number | null;
  filter: number | null;
}
export type CountState = View0DState;

export class View0D extends ViewAbstract<View0DState> {
  state: View0DState;
  constructor(falcon: Falcon) {
    super(falcon);
    this.state = { total: null, filter: null };
  }

  /**
   * returns all count from the db and signals the user
   */
  async all() {
    const total = await this.falcon.db.length();
    this.state.total = total;
    this.state.filter = total;
    this.signalOnChange(this.state);
  }

  /**
   * Given an active 1D view, count for this passive view
   */
  async countContinuous1DIndex(pixels?: Interval<number>): Promise<void> {
    // take in the index
    const index = await this.falcon.index.get(this)!;
    if (index === undefined) {
      throw Error("Cannot count for undefined index in 0D");
    }

    // update state
    if (!pixels) {
      this.state.filter = index.noFilter.get(0);
    } else {
      const A = index.filter.get(pixels[0]);
      const B = index.filter.get(pixels[1]);
      this.state.filter = B - A;
    }

    // signal user
    this.signalOnChange(this.state);
  }
  /**
   * Given an active 1D view, count for this passive view
   */
  async countCategorical1DIndex(
    selection?: CategoricalRange,
    totalRange?: CategoricalRange
  ): Promise<void> {
    // take in the index
    const index = await this.falcon.index.get(this)!;
    if (index === undefined) {
      throw Error("Cannot count for undefined index in 0D");
    }

    // update state
    if (selection === undefined) {
      this.state.filter = index.noFilter.get(0);
    } else {
      const bin = binNumberFunctionCategorical(totalRange!);
      let total = 0;
      for (const s of selection) {
        const binKey = bin(s);
        total += index.filter.get(binKey);
      }
      this.state.filter = total;
    }

    // signal user
    this.signalOnChange(this.state);
  }
}