import { predicate, Table } from "@apache-arrow/es2015-esm";
import { histogram, range } from "d3";
import { BitSet, union } from "./bitset";
import {
  binNumberFunction,
  binToData,
  is1DView,
  stepSize,
  binFunction
} from "./util";

export class DataBase<V extends string, D extends string> {
  private sortIndex = new Map<D, Uint16Array>();

  public constructor(
    private readonly data: Map<D, DataArray>,
    private readonly table: Table,
    dimensions: Set<D>
  ) {
    // precompute the sort indexes because we can reuse them
    console.time("Build sort indexes");
    for (const dim of dimensions) {
      this.sortIndex.set(dim, this.getSortIndex(dim));
    }
    console.timeEnd("Build sort indexes");
    console.timeStamp("Finished initialization");
  }

  /**
   * Compute the sort index. Used in initialization.
   */
  private getSortIndex(dimension: D) {
    const column = this.data.get(dimension)!;
    const index = new Uint16Array(range(column.length));
    index.sort((a, b) => column[a] - column[b]);
    return index;
  }

  public filteredTable(extents: Map<D, Interval<number>>) {
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

  private getFilterMask(dimension: D, extent: Interval<number>) {
    const column = this.data.get(dimension)!;
    const mask = new BitSet(column.length);

    for (let i = 0; i < column.length; i++) {
      const val = column[i];
      if (val < extent[0] || val > extent[1]) {
        mask.set(i, true);
      }
    }

    return mask;
  }

  private getFilterMasks(brushes: Map<D, Interval<number>>) {
    console.time("Build filter masks");

    const filters = new Map<D, BitSet>();
    for (const [dimension, extent] of brushes) {
      filters.set(dimension, this.getFilterMask(dimension, extent));
    }

    console.timeEnd("Build filter masks");

    return filters;
  }

  public histogram(dimension: Dimension<D>) {
    console.time("Histogram");

    const binConfig = dimension.binConfig!;
    const b = binToData(binConfig.start, binConfig.step);
    const hist = histogram()
      .domain([binConfig.start, binConfig.stop])
      .thresholds(range(binConfig.start, binConfig.stop, binConfig.step))(
        this.data.get(dimension.name)!
      )
      .map((d, i) => ({
        key: b(i),
        value: d.length
      }));

    console.timeEnd("Histogram");

    return hist;
  }

  public heatmap(dimensions: [Dimension<D>, Dimension<D>]) {
    console.time("Heatmap");

    const [dimX, dimY] = dimensions;
    const binX = binFunction(dimX.binConfig!.start, dimX.binConfig!.step);
    const binY = binFunction(dimY.binConfig!.start, dimY.binConfig!.step);

    const columnX = this.data.get(dimX.name)!;
    const columnY = this.data.get(dimY.name)!;

    const agg = new Map<string, number>();

    for (let i = 0; i < this.length; i++) {
      const x = binX(columnX[i]);
      const y = binY(columnY[i]);

      const key = x + "\0" + y;
      const val = agg.get(key);
      if (val !== undefined) {
        agg.set(key, val + 1);
      } else {
        agg.set(key, 1);
      }
    }

    const out: { keyX: number; keyY: number; value: number }[] = [];
    for (const [key, value] of agg) {
      const [keyX, keyY] = key.split("\0").map(d => +d);
      out.push({
        keyX,
        keyY,
        value
      });
    }

    console.timeEnd("Heatmap");

    return out;
  }

  public loadData(
    activeView: View1D<D>,
    pixels: number,
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ) {
    console.time("Build result cube");

    const filterMasks = this.getFilterMasks(brushes);
    const result: ResultCube<V> = new Map();

    const activeDim = activeView.dimension;
    const binActive = binNumberFunction(
      activeDim.extent[0],
      stepSize(activeDim.extent, pixels)
    );
    const activeCol = this.data.get(activeDim.name)!;
    const activeSortIndex = this.sortIndex.get(activeDim.name)!;

    for (const [name, view] of views) {
      // array for histograms with last histogram being the complete histogram
      const hists = new Array<Histogram>(pixels + 1);

      if (is1DView(view)) {
        const dim = view.dimension;

        // get union of all filter masks that don't contain the dimension for the current view
        const relevantMasks = new Map(filterMasks);
        relevantMasks.delete(dim.name);
        const filterMask = union(...relevantMasks.values());

        const bin = binNumberFunction(
          dim.binConfig!.start,
          dim.binConfig!.step
        );

        let activeBucket; // what bucket in the active dimension are we at
        let hist = new Uint32Array(dim.bins);

        const column = this.data.get(dim.name)!;

        // go through data in order of the active dimension
        for (let i = 0; i < activeSortIndex.length; i++) {
          const idx = activeSortIndex[i];

          // ignore filtered entries
          if (filterMask && filterMask.check(idx)) {
            continue;
          }

          const newActiveBucket = binActive(activeCol[idx]);

          if (
            newActiveBucket < pixels &&
            newActiveBucket >= 0 &&
            activeBucket !== newActiveBucket
          ) {
            activeBucket = newActiveBucket;
            hist = hist.slice();
            hists[activeBucket] = hist;
          }

          const key = bin(column[idx]);
          if (key >= 0 && key < dim.bins) {
            hist[key]++;
          }
        }

        hists[pixels] = hist;
      } else {
        const [dimX, dimY] = view.dimensions;

        // get union of all filter masks that don't contain the dimension for the current view
        const relevantMasks = new Map(filterMasks);
        relevantMasks.delete(dimX.name);
        relevantMasks.delete(dimY.name);
        const filterMask = union(...relevantMasks.values());

        const binX = binNumberFunction(
          dimX.binConfig!.start,
          dimX.binConfig!.step
        );
        const binY = binNumberFunction(
          dimY.binConfig!.start,
          dimY.binConfig!.step
        );

        let activeBucket; // what bucket in the active dimension are we at
        let hist = new Uint32Array(dimX.bins * dimY.bins);

        const columnX = this.data.get(dimX.name)!;
        const columnY = this.data.get(dimY.name)!;

        // go through data in order of the active dimension
        for (let i = 0; i < activeSortIndex.length; i++) {
          const idx = activeSortIndex[i];

          // ignore filtered entries
          if (filterMask && filterMask.check(idx)) {
            continue;
          }

          const newActiveBucket = binActive(activeCol[idx]);

          if (
            newActiveBucket < pixels &&
            newActiveBucket >= 0 &&
            activeBucket !== newActiveBucket
          ) {
            activeBucket = newActiveBucket;
            hist = hist.slice();
            hists[activeBucket] = hist;
          }

          const keyX = binX(columnX[idx]);
          const keyY = binY(columnY[idx]);
          if (keyX >= 0 && keyX < dimX.bins && keyY >= 0 && keyY < dimY.bins) {
            hist[keyX + dimX.bins * keyY]++;
          }
        }

        hists[pixels] = hist;
      }

      result.set(name, hists);
    }

    console.timeEnd("Build result cube");

    return result;
  }

  public get length() {
    return this.data.values().next().value.length;
  }
}
