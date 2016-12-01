import BrushableBar from './viz/brushable-bar';
import {scaleLinear, ScaleLinear} from 'd3-scale';
import {nest} from 'd3-collection';

class API {

  private cache: {[value: number]: number[]} = {};
  private activeDimension: string;
  private ranges: {[dimension: string]: Interval} = {};
  private _onResult: any;
  private scales: {[dimension: string]: ScaleLinear<number, number>} = {};

  constructor(public dimensions: Dimension[], public connection: any) {
    this.activeDimension = dimensions[0].name;
    dimensions.forEach(dimension => {
      this.ranges[dimension.name] = dimension.range;
      this.scales[dimension.name] = scaleLinear().domain(dimension.range).range([0, 100]);
    });
  }

  public init(resolutions: { dimension: string, value: number }[]) {
    resolutions.forEach((resolution) => {
      const dimension = this.dimensions.find(d => d.name === resolution.dimension);
      if (dimension) {
        this.scales[dimension.name] = scaleLinear().domain(dimension.range).range([0, resolution.value]);
      }
    });

    this.connection.send({
      type: 'init',
      resolutions: resolutions
    });
  }

  public setState(dimension: Dimension, range: Interval) {

    this.checkActiveDimension(dimension);
    this.ranges[dimension.name] = range;

    // TODO: This needs to be updated
    //       so that it selects the best approximation
    //       if the exact one isn't available in the cache.
    //
    //       We should also update the onResult handler
    //       so that it sees if incoming results are better
    //       approximations than the current.

    // Convert the range to cache index:
    const scale = this.scales[this.activeDimension];

    const scaledRange = range.map((d) => Math.round(scale(d)));
    if (this.cache[scaledRange[0]] && this.cache[scaledRange[1]]) {
      // cache hit
      Object.keys(this.cache[scaledRange[1]]).forEach((dim) => {
        if (!this.cache[scaledRange[0]][dim]) {
          return;
        }
        const data = this.combineRanges(this.cache[scaledRange[0]][dim], this.cache[scaledRange[1]][dim]);
        if (this._onResult) {
          this._onResult(dim, data);
        }
      })
    }

  }

  public setRange(dimension: Dimension, range: Interval) {
    this.setState(dimension, range);
    this.connection.send({
      type: 'setRange',
      dimension: this.activeDimension,
      range: range
    });
  }


  // Call this when you want to request a value
  // to be computed immediately.
  public load(dimension: Dimension, value: number) {
    this.checkActiveDimension(dimension);

    const scale = this.scales[this.activeDimension];
    const index = Math.round(scale(value));

    if (this.cache[index]) {
      return;
    }

    this.connection.send({
      type: 'load',
      dimension: this.activeDimension,
      value: index
    });
  }

  // Call this when you want to request a value
  // to be computed immediately.
  public preload(dimension: Dimension, value: number) {
    this.checkActiveDimension(dimension);

    const scale = this.scales[this.activeDimension];
    const index = Math.round(scale(value));

    this.connection.send({
      type: 'preload',
      dimension: this.activeDimension,
      value: index
    });
  }

  public onResult(callback: (dimension: string, data: number[]) => any) {
    this._onResult = callback;
    return (result: Result) => {
      // Ignore results from stale queries (wrong dimension)
      if (result.activeDimension === this.activeDimension) {
        if (!this.cache[result.index]) {
          this.cache[result.index] = [];
        }
        this.cache[result.index][result.dimension] = result.data;

        // This attempts to see if the new result is exactly what
        // the brush is set to now, and if so, updates it.
        const range = this.ranges[this.activeDimension];
        const scale = this.scales[this.activeDimension];
        const scaledRange = range.map(d => Math.round(scale(d)));

        const c0 = this.cache[scaledRange[0]];
        const c1 = this.cache[scaledRange[1]];

        if (c0 && c0[result.dimension] && c1 && c1[result.dimension]) {
          const combined = this.combineRanges(c0[result.dimension], c1[result.dimension]);
          callback(result.dimension, combined);
        }
      }
    };
  }

  private combineRanges(low: number[], high: number[]) {
    if (low.length !== high.length) {
      throw Error('low and high have to have the same length');
    }

    const data: number[] = [];

    for (let bucket = 0; bucket < low.length; bucket++) {
      data[bucket] = +high[bucket] - low[bucket];
    }

    return data;
  }

  private checkActiveDimension(dimension: Dimension) {
    if (this.activeDimension !== dimension.name) {
      // Clear cache because we only cache 1 dimension at a time.
      this.cache = {};
    }

    this.activeDimension = dimension.name;
  }
}

export default API;
