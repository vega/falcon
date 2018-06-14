import { predicate, Table } from "@apache-arrow/es2015-esm";
import { histogram, range } from "d3";
import { binToData, is1DView, bin, binNumberFunction, stepSize } from "./util";
import { BitSet, union } from "./bitset";

export class DataBase {
  private sortIndex = new Map<string, Uint16Array>();

  public constructor(
    private data: Map<string, any>,
    private table: Table,
    views: View[]
  ) {
    // precompute the sort indexes because we can reuse them
    console.time("Build sort indexes");
    for (const view of views) {
      if (is1DView(view)) {
        this.sortIndex.set(view.dimension, this.getSortIndex(view.dimension));
      } else {
      }
    }
    console.timeEnd("Build sort indexes");
    console.timeStamp("Finished initialization");
  }

  /**
   * Compute the sort index. Used in initialization.
   */
  private getSortIndex(dimension: string) {
    const column = this.data[dimension];
    const index = new Uint16Array(range(column.length));
    index.sort((a, b) => column[a] - column[b]);
    return index;
  }

  public filteredTable(extents: Map<string, Interval<number>>) {
    let pred: predicate.Predicate | null = null;
    for (const [col, extent] of extents) {
      const newPred = predicate
        .col(col)
        .ge(extent[0])
        .and(predicate.col(col).le(extent[1]));
      if (pred) {
        pred = pred.and(newPred);
      } else {
        pred = newPred;
      }
    }

    return this.table.filter(pred!);
  }

  private getFilterMask(dimension: string, extent: Interval<number>) {
    const column = this.data[dimension];
    const mask = new BitSet(column.length);

    for (let i = 0; i < column.length; i++) {
      const val = column[i];
      if (val < extent[0] || val > extent[1]) {
        mask.set(i, true);
      }
    }

    return mask;
  }

  private getFilterMasks(brushes: Map<string, Interval<number>>) {
    console.time("Build filter masks");

    const filters = new Map<string, BitSet>();
    for (const [dimension, extent] of brushes) {
      filters.set(dimension, this.getFilterMask(dimension, extent));
    }

    console.timeEnd("Build filter masks");

    return filters;
  }

  public histogram(dimension: string, binConfig: BinConfig) {
    const b = binToData(binConfig.start, binConfig.step);
    return histogram()
      .domain([binConfig.start, binConfig.stop])
      .thresholds(range(binConfig.start, binConfig.stop, binConfig.step))(
        this.data[dimension]
      )
      .map((d, i) => ({
        key: b(i),
        value: d.length
      }));
  }

  public loadData(
    activeView: View1D,
    pixels: number,
    views: View[],
    brushes: Map<string, Interval<number>>
  ) {
    console.time("Build result cube");

    const filterMasks = this.getFilterMasks(brushes);
    const result: ResultCube = new Map();

    const activeBinF = binNumberFunction(
      activeView.extent[0],
      stepSize(activeView.extent, pixels)
    );
    const activeCol = this.data[activeView.dimension];
    const activeSortIndex = this.sortIndex.get(activeView.dimension)!;

    for (const view of views) {
      // array for histograms with last histogram being the complete histogram
      const hists = new Array<Histogram>(pixels + 1);

      if (is1DView(view)) {
        // get union of all filter masks that don't contain the dimension for the current view
        const relevantMasks = new Map(filterMasks);
        relevantMasks.delete(view.dimension);
        const filterMask = union(...relevantMasks.values());

        const binConfig = bin({ maxbins: view.bins, extent: view.extent });
        const binF = binNumberFunction(binConfig.start, binConfig.step);

        let activeBucket; // what bucket in the active dimension are we at
        let hist = new Uint32Array(view.bins);

        const column = this.data[view.name];

        // go through data in order of the active dimension
        for (let i = 0; i < activeSortIndex.length; i++) {
          const idx = activeSortIndex[i];

          // ignore filtered entries
          if (filterMask && filterMask.check(idx)) {
            continue;
          }

          const newActiveBucket = activeBinF(activeCol[idx]);

          if (newActiveBucket >= pixels) {
            // fill last array
            hists[pixels] = hist;
          } else if (newActiveBucket >= 0 && activeBucket !== newActiveBucket) {
            activeBucket = newActiveBucket;
            hist = hist.slice();
            hists[activeBucket] = hist;
          }

          const key = binF(column[idx]);
          if (key >= 0 && key < view.bins) {
            hist[key]++;
          }
        }
      }

      result.set(view.name, hists);
    }

    console.timeEnd("Build result cube");

    return result;
  }

  public get length() {
    return this.data[Object.keys(this.data)[0]].length;
  }
}
