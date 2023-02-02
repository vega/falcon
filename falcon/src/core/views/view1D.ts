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

/* defines how the parameter is typed for on change */
export interface ContinuousView1DState {
  total: Int32Array | null;
  filter: Int32Array | null;
  bin: { binStart: number; binEnd: number }[] | null;
}
export interface CategoricalView1DState {
  total: Int32Array | null;
  filter: Int32Array | null;
  bin: any[] | null;
}
export type View1DState = CategoricalView1DState | ContinuousView1DState;

export class View1D extends ViewAbstract<View1DState> {
  dimension: Dimension;
  state: View1DState | CategoricalView1DState;
  toPixels: (brush: Interval<number>) => Interval<number>;
  lastFilter: DimensionFilter | undefined;
  constructor(falcon: Falcon, dimension: Dimension) {
    super(falcon);
    this.dimension = dimension;
    this.state = { total: null, filter: null, bin: null };
    this.toPixels = () => [0, 0];
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

  async all() {
    await this.createBins();

    const counts = await this.falcon.db.histogramView1D(this);
    this.state.total = counts.noFilter.data as Int32Array;
    this.state.filter = counts.filter.data as Int32Array;

    this.signalOnChange(this.state);
  }

  /**
   * prefetch the 1D falcon index
   */
  async prefetch() {
    if (!this.isActive) {
      // make the current one active
      this.makeActiveView();

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
   * compute counts from the falcon index
   */
  async add(filter?: DimensionFilter, convertToPixels = true) {
    await this.prefetch();

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

        // use the index to count for the passive views
        this.falcon.views.passive.forEach(async (passiveView) => {
          await passiveView.countContinuous1DIndex(
            selectPixels as ContinuousRange
          );
        });

        this.lastFilter = filter;
      } else {
        // add filter
        this.falcon.filters.set(this.dimension, filter);

        // use the index to count for the passive views
        this.falcon.views.passive.forEach(async (passiveView) => {
          await passiveView.countCategorical1DIndex(
            filter as CategoricalRange,
            this.dimension.range!
          );
        });

        this.lastFilter = filter;
      }
    } else {
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
          await passiveView.countContinuous1DIndex();
        });

        this.lastFilter = filter;
      } else {
        // remove filter
        this.falcon.filters.delete(this.dimension);
        // and revert back counts
        this.falcon.views.passive.forEach(async (passiveView) => {
          await passiveView.countCategorical1DIndex();
        });

        this.lastFilter = filter;
      }
    }
  }

  /**
   * Given an active 1D view, count for this passive view
   */
  async countContinuous1DIndex(pixels?: Interval<number>) {
    // grab index
    const index = await this.falcon.index.get(this)!;
    if (index === undefined) {
      throw Error("Index not defined for 1D passive view");
    }

    // update state
    if (!pixels) {
      this.state.filter = index.noFilter.data as Int32Array;
    } else {
      // select the columns and subtract them to get in between [A, B]
      const A = index.filter.slice(pixels[0], null);
      const B = index.filter.slice(pixels[1], null);
      const binCounts = B.sub(A);

      this.state.filter = binCounts.data as Int32Array;
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
  ) {
    // grab index
    const index = await this.falcon.index.get(this)!;
    if (index === undefined) {
      throw Error("Index not defined for 1D passive view");
    }

    // update state
    if (!selection) {
      this.state.filter = index.noFilter.data as Int32Array;
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
        binCounts.addOverride(counts);
      }
      this.state.filter = binCounts.data as Int32Array;
    }

    // signal user
    this.signalOnChange(this.state);
  }
}
