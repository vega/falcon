import { ViewAbstract } from "./viewAbstract";
import {
  createBinConfigContinuous,
  readableBinsContinuous,
  brushToPixelSpace,
  binNumberFunctionCategorical,
  numBinsContinuous,
} from "../util";
import type { Falcon } from "../falcon";
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
  isAttached: boolean;
  constructor(falcon: Falcon, dimension: Dimension) {
    super(falcon);
    this.dimension = dimension;
    this.state = { total: null, filter: null, bin: null };
    this.toPixels = () => [0, 0];
    this.isAttached = true;
  }

  /**
   * populates the extent in the dimension if not already defined
   */
  async createBins() {
    if (this.dimension?.range === undefined) {
      this.dimension.range = await this.falcon.db.range(this.dimension);
    }
    if (this.dimension.type === "continuous") {
      this.toPixels = brushToPixelSpace(
        this.dimension.range!,
        this.dimension.resolution
      );
      this.dimension.binConfig = createBinConfigContinuous(
        this.dimension,
        this.dimension.range!
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
  async initializeAllCounts() {
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
  async prefetch() {
    if (!this.isActive) {
      // make sure we have binConfigs computed for all views if this one is activated
      await this.falcon.views.forEach(async (view) => {
        const rangeNotComputed =
          view instanceof View1D &&
          (!("range" in view.dimension) ||
            (view.dimension.type === "continuous" &&
              !("binConfig" in view.dimension)));

        // we just count the whole shebang too
        if (rangeNotComputed) {
          await view.initializeAllCounts();
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
    await this.prefetch();
  }

  /**
   * compute counts from the falcon index
   */
  async select(filter?: DimensionFilter, convertToPixels = true) {
    if (filter) {
      if (this.dimension.type === "continuous") {
        // just end now if the filter hasn't changed
        const filterStayedTheSame =
          this.lastFilter &&
          this.lastFilter[0] === filter[0] &&
          this.lastFilter[1] === filter[1];
        if (filterStayedTheSame) {
          return;
        }

        // add filter
        this.falcon.filters.set(this.dimension, filter);

        // convert active selection into pixels if needed
        let selectPixels = convertToPixels
          ? this.toPixels(filter as ContinuousRange)
          : filter;

        /**
         * if they query something outside the possible resolution.
         * just do nothing!
         */
        if (selectPixels[1] > this.dimension.resolution) {
          selectPixels[1] = this.dimension.resolution;
        }
        if (selectPixels[0] > this.dimension.resolution) {
          selectPixels[0] = this.dimension.resolution;
        }
        if (selectPixels[1] < 0) {
          selectPixels[1] = 0;
        }
        if (selectPixels[0] < 0) {
          selectPixels[0] = 0;
        }

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

  detach() {
    this.falcon.views.remove(this);
    this.isAttached = false;
  }
  attach() {
    this.falcon.views.add(this);
    this.isAttached = true;
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
        const counts = index.filter.slice(binKey, null);
        binCounts.addToItself(counts);
      }
      this.state.filter = binCounts.data as CountsArrayType;
    }

    // signal user
    this.signalOnChange(this.state);
  }
}
