import { Table } from "@apache-arrow/es2015-esm";
import ndarray from "ndarray";
import prefixSum from "ndarray-prefix-sum";
import { Dimension, View1D, View2D, Views } from "../api";
import { Interval } from "../basic";
import { BitSet, union } from "../bitset";
import { CUM_ARR_TYPE, HIST_TYPE } from "../consts";
import { binNumberFunction, binNumberFunctionBins, numBins } from "../util";
import { DataBase, SyncIndex } from "./db";

export class ArrowDB<V extends string, D extends string>
  implements DataBase<V, D> {
  private data: Table<{ [key in D]: any }>;

  public readonly blocking: boolean = true;

  public constructor(private readonly urlOrArrayBuffer: string | ArrayBuffer) {}

  private filterMaskIndex = new Map<string, BitSet>();

  public async initialize() {
    let buffer: ArrayBuffer;

    if (typeof this.urlOrArrayBuffer === "string") {
      const response = await fetch(this.urlOrArrayBuffer);
      buffer = await response.arrayBuffer();
    } else {
      buffer = this.urlOrArrayBuffer;
    }

    this.data = Table.from(new Uint8Array(buffer));

    return;
  }

  private getFilterMask(dimension: D, extent: Interval<number>) {
    const key = `${dimension} ${extent}`;

    const m = this.filterMaskIndex.get(key);
    if (m) {
      return m;
    }

    const column = this.data.getColumn(dimension)!;
    const mask = new BitSet(column.length);

    for (let i = 0; i < column.length; i++) {
      const val: number = column.get(i)!;
      if (val < extent[0] || val >= extent[1]) {
        mask.set(i, true);
      }
    }

    this.filterMaskIndex.set(key, mask);

    return mask;
  }

  public length() {
    return this.data.length;
  }

  public histogram(
    dimension: Dimension<D>,
    brushes?: Map<D, Interval<number>>
  ) {
    console.time("Histogram");

    const filterMask = union(
      ...this.getFilterMasks(brushes || new Map()).values()
    );

    const binConfig = dimension.binConfig!;
    const bin = binNumberFunction(binConfig);
    const binCount = numBins(binConfig);

    const column = this.data.getColumn(dimension.name)!;

    const noBrush = ndarray(new HIST_TYPE(binCount));
    const hist = filterMask ? ndarray(new HIST_TYPE(binCount)) : noBrush;
    for (let i = 0; i < this.data.length; i++) {
      const value: number = column.get(i)!;
      const key = bin(value);
      if (0 <= key && key < binCount) {
        const idx = hist.index(key);
        noBrush.data[idx]++;
        if (filterMask && !filterMask.get(i)) {
          hist.data[idx]++;
        }
      }
    }

    console.timeEnd("Histogram");

    return {
      hist,
      noBrush
    };
  }

  public heatmap(dimensions: [Dimension<D>, Dimension<D>]) {
    console.time("Heatmap");

    const binConfigs = dimensions.map(d => d.binConfig!);
    const [numBinsX, numBinsY] = binConfigs.map(numBins);
    const [binX, binY] = binConfigs.map(binNumberFunction);
    const [columnX, columnY] = dimensions.map(
      d => this.data.getColumn(d.name)!
    );

    const heat = ndarray(new HIST_TYPE(numBinsX * numBinsY), [
      numBinsX,
      numBinsY
    ]);

    for (let i = 0; i < this.data.length; i++) {
      const keyX = binX(columnX.get(i)!);
      const keyY = binY(columnY.get(i)!);

      if (0 <= keyX && keyX < numBinsX && 0 <= keyY && keyY < numBinsY) {
        heat.data[heat.index(keyX, keyY)]++;
      }
    }

    console.timeEnd("Heatmap");

    return heat;
  }

  private getFilterMasks(brushes: Map<D, Interval<number>>): Map<D, BitSet> {
    if (!brushes.size) {
      // no brushes => no filters
      return new Map();
    }

    console.time("Build filter masks");

    const filters = new Map<D, BitSet>();
    for (const [dimension, extent] of brushes) {
      filters.set(dimension, this.getFilterMask(dimension, extent));
    }

    console.timeEnd("Build filter masks");

    return filters;
  }

  public loadData1D(
    activeView: View1D<D>,
    pixels: number,
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ) {
    console.time("Build index");

    const filterMasks = this.getFilterMasks(brushes);
    const cubes: SyncIndex<V> = new Map();

    const activeDim = activeView.dimension;
    const binActive = binNumberFunctionBins(activeDim.binConfig!, pixels);
    const activeCol = this.data.getColumn(activeDim.name)!;
    const numPixels = pixels + 1; // extending by one pixel so we can compute the right diff later

    for (const [name, view] of views) {
      // array for histograms with last histogram being the complete histogram
      let hists: ndarray;
      let noBrush: ndarray;

      // get union of all filter masks that don't contain the dimension(s) for the current view
      const relevantMasks = new Map(filterMasks);
      if (view.type === "0D") {
        // use all filters
      } else if (view.type === "1D") {
        relevantMasks.delete(view.dimension.name);
      } else {
        relevantMasks.delete(view.dimensions[0].name);
        relevantMasks.delete(view.dimensions[1].name);
      }
      const filterMask = union(...relevantMasks.values());

      if (view.type === "0D") {
        hists = ndarray(new CUM_ARR_TYPE(numPixels));
        noBrush = ndarray(new HIST_TYPE(1), [1]);

        // add data to aggregation matrix
        for (let i = 0; i < this.data.length; i++) {
          // ignore filtered entries
          if (filterMask && filterMask.get(i)) {
            continue;
          }

          const keyActive = binActive(activeCol.get(i)!) + 1;
          if (0 <= keyActive && keyActive < numPixels) {
            hists.data[hists.index(keyActive)]++;
          }
          noBrush.data[0]++;
        }

        prefixSum(hists);
      } else if (view.type === "1D") {
        const dim = view.dimension;

        const binConfig = dim.binConfig!;
        const bin = binNumberFunction(binConfig);
        const binCount = numBins(binConfig);

        hists = ndarray(new CUM_ARR_TYPE(numPixels * binCount), [
          numPixels,
          binCount
        ]);
        noBrush = ndarray(new HIST_TYPE(binCount), [binCount]);

        const column = this.data.getColumn(dim.name)!;

        // add data to aggregation matrix
        for (let i = 0; i < this.data.length; i++) {
          // ignore filtered entries
          if (filterMask && filterMask.get(i)) {
            continue;
          }

          const key = bin(column.get(i)!);
          const keyActive = binActive(activeCol.get(i)!) + 1;
          if (0 <= key && key < binCount) {
            if (0 <= keyActive && keyActive < numPixels) {
              hists.data[hists.index(keyActive, key)]++;
            }
            noBrush.data[key]++;
          }
        }

        // compute cumulative sums
        for (let x = 0; x < hists.shape[1]; x++) {
          prefixSum(hists.pick(null, x));
        }
      } else {
        const dimensions = view.dimensions;
        const binConfigs = dimensions.map(d => d.binConfig!);
        const [numBinsX, numBinsY] = binConfigs.map(numBins);
        const [binX, binY] = binConfigs.map(c => binNumberFunction(c));
        const [columnX, columnY] = dimensions.map(
          d => this.data.getColumn(d.name)!
        );

        hists = ndarray(new CUM_ARR_TYPE(numPixels * numBinsX * numBinsY), [
          numPixels,
          numBinsX,
          numBinsY
        ]);
        noBrush = ndarray(new HIST_TYPE(numBinsX * numBinsY), [
          numBinsX,
          numBinsY
        ]);

        for (let i = 0; i < this.data.length; i++) {
          // ignore filtered entries
          if (filterMask && filterMask.get(i)) {
            continue;
          }

          const keyX = binX(columnX.get(i)!);
          const keyY = binY(columnY.get(i)!);
          const keyActive = binActive(activeCol.get(i)!) + 1;
          if (0 <= keyX && keyX < numBinsX && 0 <= keyY && keyY < numBinsY) {
            if (0 <= keyActive && keyActive < numPixels) {
              hists.data[hists.index(keyActive, keyX, keyY)]++;
            }
            noBrush.data[noBrush.index(keyX, keyY)]++;
          }
        }

        // compute cumulative sums
        for (let x = 0; x < hists.shape[1]; x++) {
          for (let y = 0; y < hists.shape[2]; y++) {
            prefixSum(hists.pick(null, x, y));
          }
        }
      }

      cubes.set(name, { hists, noBrush: noBrush });
    }

    console.timeEnd("Build index");

    return cubes;
  }

  public loadData2D(
    activeView: View2D<D>,
    pixels: [number, number],
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ) {
    console.time("Build index");

    const filterMasks = this.getFilterMasks(brushes);
    const cubes: SyncIndex<V> = new Map();

    const [activeDimX, activeDimY] = activeView.dimensions;
    const binActiveX = binNumberFunctionBins(activeDimX.binConfig!, pixels[0]);
    const binActiveY = binNumberFunctionBins(activeDimY.binConfig!, pixels[1]);
    const activeColX = this.data.getColumn(activeDimX.name)!;
    const activeColY = this.data.getColumn(activeDimY.name)!;

    const [numPixelsX, numPixelsY] = [pixels[0] + 1, pixels[1] + 1];

    for (const [name, view] of views) {
      // array for histograms with last histogram being the complete histogram
      let hists: ndarray;
      let noBrush: ndarray;

      // get union of all filter masks that don't contain the dimension(s) for the current view
      const relevantMasks = new Map(filterMasks);
      if (view.type === "0D") {
        // use all filters
      } else if (view.type === "1D") {
        relevantMasks.delete(view.dimension.name);
      } else {
        relevantMasks.delete(view.dimensions[0].name);
        relevantMasks.delete(view.dimensions[1].name);
      }
      const filterMask = union(...relevantMasks.values());

      if (view.type === "0D") {
        hists = ndarray(new CUM_ARR_TYPE(numPixelsX * numPixelsY), [
          numPixelsX,
          numPixelsY
        ]);
        noBrush = ndarray(new HIST_TYPE(1));

        // add data to aggregation matrix
        for (let i = 0; i < this.data.length; i++) {
          // ignore filtered entries
          if (filterMask && filterMask.get(i)) {
            continue;
          }

          const keyActiveX = binActiveX(activeColX.get(i)!) + 1;
          const keyActiveY = binActiveY(activeColY.get(i)!) + 1;
          if (
            0 <= keyActiveX &&
            keyActiveX < numPixelsX &&
            0 <= keyActiveY &&
            keyActiveY < numPixelsY
          ) {
            hists.data[hists.index(keyActiveX, keyActiveY)]++;
          }

          // add to cumulative hist
          noBrush.data[0]++;
        }

        prefixSum(hists);
      } else if (view.type === "1D") {
        const dim = view.dimension;

        const binConfig = dim.binConfig!;
        const bin = binNumberFunction(binConfig);
        const binCount = numBins(binConfig);

        hists = ndarray(new CUM_ARR_TYPE(numPixelsX * numPixelsY * binCount), [
          numPixelsX,
          numPixelsY,
          binCount
        ]);
        noBrush = ndarray(new HIST_TYPE(binCount));

        const column = this.data.getColumn(dim.name)!;

        // add data to aggregation matrix
        for (let i = 0; i < this.data.length; i++) {
          // ignore filtered entries
          if (filterMask && filterMask.get(i)) {
            continue;
          }

          const key = bin(column.get(i)!);
          const keyActiveX = binActiveX(activeColX.get(i)!) + 1;
          const keyActiveY = binActiveY(activeColY.get(i)!) + 1;
          if (0 <= key && key < binCount) {
            if (
              0 <= keyActiveX &&
              keyActiveX < numPixelsX &&
              0 <= keyActiveY &&
              keyActiveY < numPixelsY
            ) {
              hists.data[hists.index(keyActiveX, keyActiveY, key)]++;
            }

            // add to cumulative hist
            noBrush.data[key]++;
          }
        }

        // compute cumulative sums
        for (let x = 0; x < hists.shape[2]; x++) {
          prefixSum(hists.pick(null, null, x));
        }
      } else {
        throw new Error("2D view brushing and viewing not yet implemented.");
      }

      cubes.set(name, { hists, noBrush: noBrush });
    }

    console.timeEnd("Build index");

    return cubes;
  }

  public getDimensionExtent(dimension: Dimension<D>): Interval<number> {
    const column = this.data.getColumn(dimension.name)!;
    let max: number = column.get(0)!;
    let min = max;

    for (let value of column) {
      if (value! > max) {
        max = value!;
      } else if (value! < min) {
        min = value!;
      }
    }

    return [min, max];
  }
}
