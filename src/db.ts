import { predicate, Table } from "@apache-arrow/es2015-esm";
import { histogram, range } from "d3";
import { binToData, is1DView, bin, binNumberFunction, stepSize } from "./util";
import { BitSet } from "./bitset";

export class DataBase {
  private sortIndex = new Map<string, number[]>();

  public constructor(
    private data: Map<string, any>,
    private table: Table,
    views: View[]
  ) {
    // precompute the sort indexes because we can reuse them
    console.time("Building sort indexes");
    for (const view of views) {
      if (is1DView(view)) {
        this.sortIndex.set(view.dimension, this.getSortIndex(view.dimension));
      } else {
      }
    }
    console.timeEnd("Building sort indexes");
    console.timeStamp("Finished initialization");
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

  private createFilterMask(extents: Map<string, Interval<number>>) {
    const size = this.length();
    const mask = new BitSet(size);

    for (let i = 0; i < size; i++) {
      for (const [col, extent] of extents) {
        const val = this.data[col][i];
        if (val < extent[0] || val > extent[1]) {
          mask.set(i, true);
          break;
        }
      }
    }

    return mask;
  }

  /**
   * Compute the sort index. Used in initialization.
   */
  private getSortIndex(dimension: string) {
    const index = range(this.length());
    const column = this.data[dimension];
    index.sort((a, b) => column[a] - column[b]);
    return index;
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
    console.time("Building result cube");

    const filterMask = this.createFilterMask(brushes);
    const result: ResultCube = new Map();

    const activeBinF = binNumberFunction(
      activeView.extent[0],
      stepSize(activeView.extent, pixels)
    );
    const activeCol = this.data[activeView.dimension];
    const activeSortIndex = this.sortIndex.get(activeView.dimension)!;

    for (const view of views) {
      const hists: Histogram[] = [];

      if (is1DView(view)) {
        const binConfig = bin({ maxbins: view.bins, extent: view.extent });
        const binF = binNumberFunction(binConfig.start, binConfig.step);

        let activeBucket; // what bucket in the active dimension are we at
        let hist = new Uint32Array(view.bins);

        const column = this.data[view.name];

        // go through data in order of the active dimension
        for (let i = 0; i < activeSortIndex.length; i++) {
          const idx = activeSortIndex[i];

          // ignore filtered entries
          if (filterMask.check(idx)) {
            continue;
          }

          const newActiveBucket = activeBinF(activeCol[idx]);

          if (
            newActiveBucket >= 0 &&
            newActiveBucket < pixels &&
            activeBucket !== newActiveBucket
          ) {
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

    console.timeEnd("Building result cube");

    return result;
  }

  public length() {
    return this.data[Object.keys(this.data)[0]].length;
  }
}
