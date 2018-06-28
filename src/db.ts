import ndarray from "ndarray";
import prefixSum from "ndarray-prefix-sum";
import { BitSet, union } from "./bitset";
import { binNumberFunction, numBins, stepSize } from "./util";

export class DataBase<V extends string, D extends string> {
  public constructor(private readonly data: Map<D, DataArray>) {}

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
    const bin = binNumberFunction(binConfig);
    const binCount = numBins(binConfig);

    const hist = ndarray(new Uint32Array(binCount));
    for (const value of this.data.get(dimension.name)!) {
      const key = bin(value);
      if (0 <= key && key < binCount) {
        hist.data[hist.index(key)]++;
      }
    }

    console.timeEnd("Histogram");

    return hist;
  }

  public heatmap(dimensions: [Dimension<D>, Dimension<D>]) {
    console.time("Heatmap");

    const binConfigs = dimensions.map(d => d.binConfig!);
    const [numBinsX, numBinsY] = binConfigs.map(numBins);
    const [binX, binY] = binConfigs.map(binNumberFunction);
    const [columnX, columnY] = dimensions.map(d => this.data.get(d.name)!);

    const heat = ndarray(new Uint32Array(numBinsX * numBinsY), [
      numBinsX,
      numBinsY
    ]);

    for (let i = 0; i < this.length; i++) {
      const keyX = binX(columnX[i]);
      const keyY = binY(columnY[i]);

      if (0 <= keyX && keyX < numBinsX && 0 <= keyY && keyY < numBinsY) {
        heat.data[heat.index(keyX, keyY)]++;
      }
    }

    console.timeEnd("Heatmap");

    return heat;
  }

  public loadData(
    activeView: View1D<D>,
    pixels: number,
    views: Views<V, D>,
    brushes: Map<D, Interval<number>>
  ) {
    console.time("Build result cube");

    const filterMasks = this.getFilterMasks(brushes);
    const result = new Map<V, ndarray>();

    const activeDim = activeView.dimension;
    const binActive = binNumberFunction({
      start: activeDim.extent[0],
      step: stepSize(activeDim.extent, pixels)
    });
    const activeCol = this.data.get(activeDim.name)!;

    for (const [name, view] of views) {
      // array for histograms with last histogram being the complete histogram
      let hists: ndarray;

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
        hists = ndarray(new Int32Array(pixels + 1));

        // add data to aggregation matrix
        for (let i = 0; i < this.length; i++) {
          // ignore filtered entries
          if (filterMask && filterMask.check(i)) {
            continue;
          }

          const keyActive = binActive(activeCol[i]);
          if (0 <= keyActive && keyActive < pixels) {
            hists.data[hists.index(keyActive)]++;
          } else {
            // add to cumulative hist
            hists.data[hists.index(pixels)]++;
          }
        }

        prefixSum(hists);
      } else if (view.type === "1D") {
        const dim = view.dimension;

        const binConfig = dim.binConfig!;
        const bin = binNumberFunction(binConfig);
        const binCount = numBins(binConfig);

        hists = ndarray(new Uint32Array((pixels + 1) * binCount), [
          pixels + 1, // last histogram is cumulation of all others
          binCount
        ]);

        const column = this.data.get(dim.name)!;

        // add data to aggregation matrix
        for (let i = 0; i < this.length; i++) {
          // ignore filtered entries
          if (filterMask && filterMask.check(i)) {
            continue;
          }

          const key = bin(column[i]);
          const keyActive = binActive(activeCol[i]);
          if (0 <= key && key < binCount) {
            if (0 <= keyActive && keyActive < pixels) {
              hists.data[hists.index(keyActive, key)]++;
            } else {
              // add to cumulative hist
              hists.data[hists.index(pixels, key)]++;
            }
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
        const [binX, binY] = binConfigs.map(binNumberFunction);
        const [columnX, columnY] = dimensions.map(d => this.data.get(d.name)!);

        hists = ndarray(new Uint32Array((pixels + 1) * numBinsX * numBinsY), [
          pixels + 1, // last histogram is cumulation of all others
          numBinsX,
          numBinsY
        ]);

        for (let i = 0; i < this.length; i++) {
          // ignore filtered entries
          if (filterMask && filterMask.check(i)) {
            continue;
          }

          const keyX = binX(columnX[i]);
          const keyY = binY(columnY[i]);
          const keyActive = binActive(activeCol[i]);
          if (0 <= keyX && keyX < numBinsX && 0 <= keyY && keyY < numBinsY) {
            if (0 <= keyActive && keyActive < pixels) {
              hists.data[hists.index(keyActive, keyX, keyY)]++;
            } else {
              // add to cumulative hist
              hists.data[hists.index(pixels, keyX, keyY)]++;
            }
          }
        }

        // compute cumulative sums
        for (let x = 0; x < hists.shape[1]; x++) {
          for (let y = 0; y < hists.shape[2]; y++) {
            prefixSum(hists.pick(null, x, y));
          }
        }
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
