import { ViewAbstract } from "./viewAbstract";
import {
  createBinConfigContinuous,
  readableBinsContinuous,
  brushToPixelSpace,
  binNumberFunctionCategorical,
  numBinsContinuous,
} from "../util";
import type { FalconVis } from "../falcon";
import type {
  CategoricalRange,
  ContinuousRange,
  Dimension,
  DimensionFilter,
} from "../dimension";
import type { Interval } from "../util";
import { FalconArray } from "../falconArray";
import type { CountsArrayType } from "../falconArray/arrayTypes";

/* defines how the parameter is typed for on change */
export interface ContinuousView1DState {
  total: CountsArrayType | null;
  filter: CountsArrayType | null;
  bin: { binStart: number; binEnd: number }[] | null;
}
export interface CategoricalView1DState {
  total: CountsArrayType | null;
  filter: CountsArrayType | null;
  bin: any[] | null;
}
export type View1DState = CategoricalView1DState | ContinuousView1DState;

export class View1D extends ViewAbstract<View1DState> {
  dimension: Dimension;
  state: View1DState | CategoricalView1DState;
  toPixels: (brush: Interval<number>) => Interval<number>;
  lastFilter: DimensionFilter | undefined;
  constructor(falcon: FalconVis, dimension: Dimension) {
    super(falcon);
    this.dimension = dimension;
    this.state = { total: null, filter: null, bin: null };
    this.toPixels = () => [0, 0];
  }

  /**
   * slowest way to update data
   *
   * @todo this breaks when an active view is on
   * @todo replace this with targeted updates instead of just recomputing everything
   */
  async update(dimension: Dimension) {
    this.dimension = dimension;
    await this.falcon.link();
  }

  /**
   * populates the extent in the dimension if not already defined
   */
  async createBins() {
    if (this.dimension?.range === undefined) {
      this.dimension.range = await this.falcon.db.range(this.dimension);
    }
    if (this.dimension.type === "continuous") {
      // if the bins are specified, autocompute the best num of bins!
      this.dimension.bins =
        this.dimension.bins ??
        (await this.falcon.db.estimateNumBins(this.dimension, 200, 15));

      this.dimension.binConfig = createBinConfigContinuous(
        this.dimension,
        this.dimension.range!
      );
      const { start: firstBinStart, stop: veryLastBinEnd } =
        this.dimension.binConfig!;
      this.toPixels = brushToPixelSpace(
        [firstBinStart, veryLastBinEnd],
        this.dimension.resolution
      );
    }

    if (this.dimension.type === "continuous") {
      // save the bin definitions
      this.state.bin = readableBinsContinuous(this.dimension.binConfig!);
    } else {
      this.state.bin = this.dimension.range!;
    }
  }

  /**
   *  initializes the counts for the view over the entire data
   *
   * @returns the View1D class itself
   */
  async all() {
    await this.createBins();

    const counts = await this.falcon.db.histogramView1D(
      this,
      this.falcon.filters.size > 0 ? this.falcon.otherFilters(this) : undefined
    );
    this.state.total = counts.noFilter.data as CountsArrayType;
    this.state.filter = counts.filter.data as CountsArrayType;

    this.signalOnChange(this.state);

    return this;
  }

  /**
   * prefetch the 1D falcon index
   */
  async computeIndex(force = false) {
    if (!this.isActive || force) {
      // make sure we have binConfigs computed for all views if this one is activated
      await this.falcon.views.forEach(async (view) => {
        const rangeNotComputed =
          view instanceof View1D &&
          (!("range" in view.dimension) ||
            (view.dimension.type === "continuous" &&
              !("binConfig" in view.dimension)));

        // we just count the whole shebang too
        if (rangeNotComputed) {
          await view.all();
        }
      });

      // make the current one active and rest passive
      this.markThisViewActive();

      // fetch the index
      // and store globally
      this.falcon.index = this.falcon.db.falconIndexView1D(
        this,
        this.falcon.views.passive,
        this.falcon.passiveFilters
      );
    }
  }

  /**
   * activates this view: makes this view the active view
   *
   * this prefetches the falcon index under the hood that does all the speedups
   */
  async activate() {
    await this.computeIndex();
  }

  /**
   * compute counts from the falcon index
   */
  async select(filter?: DimensionFilter, force = false) {
    if (filter) {
      if (this.dimension.type === "continuous") {
        // just end now if the filter hasn't changed
        const filterStayedTheSame =
          this.lastFilter &&
          this.lastFilter[0] === filter[0] &&
          this.lastFilter[1] === filter[1];
        if (filterStayedTheSame && force === false) {
          return;
        }

        // add filter
        this.falcon.filters.set(this.dimension, filter);

        // convert active selection into pixels if needed
        let selectPixels = this.toPixels(filter as ContinuousRange);

        if (this.isActive) {
          // use the index to count for the passive views
          this.falcon.views.passive.forEach(async (passiveView) => {
            await passiveView.countFromActiveContinuous1D(
              selectPixels as ContinuousRange
            );
          });
        }

        this.lastFilter = filter;
      } else {
        // add filter
        this.falcon.filters.set(this.dimension, filter);

        if (this.isActive) {
          // use the index to count for the passive views
          this.falcon.views.passive.forEach(async (passiveView) => {
            await passiveView.countFromActiveCategorical1D(
              filter as CategoricalRange,
              this.dimension.range!
            );
          });
        }

        this.lastFilter = filter;
      }
    } else {
      if (this.isActive) {
        if (this.dimension.type === "continuous") {
          // just end now if the filter hasn't changed (still undefined)
          const filterStayedTheSame = this.lastFilter === filter;
          if (filterStayedTheSame) {
            return;
          }

          // remove filter
          this.falcon.filters.delete(this.dimension);
          // and revert back counts
          this.falcon.views.passive.forEach(async (passiveView) => {
            await passiveView.countFromActiveContinuous1D();
          });

          this.lastFilter = filter;
        } else {
          // remove filter
          this.falcon.filters.delete(this.dimension);
          // and revert back counts
          this.falcon.views.passive.forEach(async (passiveView) => {
            await passiveView.countFromActiveCategorical1D();
          });

          this.lastFilter = filter;
        }
      }
    }
  }

  /**
   * Given an active 1D view, count for this passive view
   */
  async countFromActiveContinuous1D(pixels?: Interval<number>) {
    // grab index
    const index = await this.falcon.index.get(this)!;
    if (index === undefined) {
      throw Error("Index not defined for 1D passive view");
    }

    // update state
    if (!pixels) {
      this.state.filter = index.noFilter.data as CountsArrayType;
    } else {
      // select the columns and subtract them to get in between [A, B]
      const A = index.filter.slice(pixels[0], null);
      const B = index.filter.slice(pixels[1], null);
      const binCounts = B.sub(A);

      this.state.filter = binCounts.data as CountsArrayType;
    }

    // signal user
    this.signalOnChange(this.state);
  }

  /**
   * Given an active 1D view, count for this passive view
   */
  async countFromActiveCategorical1D(
    selection?: CategoricalRange,
    totalRange?: CategoricalRange
  ) {
    // grab index
    const index = await this.falcon.index.get(this)!;
    if (index === undefined) {
      throw Error("Index not defined for 1D passive view");
    }

    // update state
    if (!selection) {
      this.state.filter = index.noFilter.data as CountsArrayType;
    } else {
      let binCounts: FalconArray;
      if (this.dimension.type === "continuous") {
        binCounts = FalconArray.allocCounts(
          numBinsContinuous(this.dimension.binConfig!)
        );
      } else {
        binCounts = FalconArray.allocCounts(this.dimension.range!.length);
      }
      binCounts.data.fill(0);

      const bin = binNumberFunctionCategorical(totalRange!);
      for (const s of selection) {
        const binKey = bin(s);
        if (binKey) {
          const counts = index.filter.slice(binKey, null);
          binCounts.addToItself(counts);
        }
      }
      this.state.filter = binCounts.data as CountsArrayType;
    }

    // signal user
    this.signalOnChange(this.state);
  }

  /**
   * attaches to the global falcon index
   */
  async attach() {
    this.falcon.views.add(this);
    await this.falcon.link();
  }

  /**
   * detaches from the global falcon index
   *
   * if I detach an active view, I need to relink
   */
  async detach() {
    this.falcon.views.remove(this);
    this.falcon.index.delete(this);

    // if we remove the active view, revert back
    if (this.isActive) {
      await this.falcon.link();
    }
  }
}
