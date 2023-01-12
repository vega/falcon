import { ViewAbstract } from "./viewAbstract";
import { Interval } from "../../old/basic";
import type { Falcon } from "../falcon";

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
  async count1DIndex(pixels?: Interval<number>): Promise<void> {
    // take in the index
    const index = await this.falcon.index.get(this)!;
    if (index === undefined) {
      throw Error("Cannot count for undefined index in 0D");
    }

    // update state
    if (!pixels) {
      this.state.filter = index.noBrush.get(0);
    } else {
      const A = index.hists.get(pixels[0]);
      const B = index.hists.get(pixels[1]);
      this.state.filter = B - A;
    }

    // signal user
    this.signalOnChange(this.state);
  }
  async count2DIndex(pixels?: [Interval<number>, Interval<number>]) {
    // take in the index
    const index = await this.falcon.index.get(this)!;
    if (index === undefined) {
      throw Error("Cannot count for undefined index in 0D");
    }

    // update state
    if (!pixels) {
      this.state.filter = index.noBrush.get(0);
    } else {
      const A = index.hists.get(pixels[0][1], pixels[1][1]);
      const B = index.hists.get(pixels[0][1], pixels[1][0]);
      const C = index.hists.get(pixels[0][0], pixels[1][1]);
      const D = index.hists.get(pixels[0][0], pixels[1][0]);
      this.state.filter = A - B - C + D;
    }

    // signal user
    this.signalOnChange(this.state);
  }
}
