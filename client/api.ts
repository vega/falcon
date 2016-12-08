import {scaleLinear, ScaleLinear} from 'd3-scale';
import {debugging} from '../config';
import {Cache, SnappingCache, SimpleCache} from './cache';
import {optimizations} from '../config';

class API {

  public cache: Cache;
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

    if (optimizations.snapping) {
      this.cache = new SnappingCache();
    } else {
      this.cache = new SimpleCache();
    }
  }

  public init(resolutions: { dimension: string, value: number }[]) {
    if (debugging.logApi) {
      console.log(`API: init ${resolutions.map(r => `${r.dimension}:${r.value}`).join(', ')}`);
    }

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
    this.setActiveDimension(dimension);
    this.ranges[dimension.name] = range;

    if (!this._onResult) {
      return;
    }

    // Convert the range to cache index:
    const scale = this.scales[this.activeDimension];
    const scaledRange = range.map((d) => Math.round(scale(d)));

    this.cache.getAllCombined(scaledRange[0], scaledRange[1]).forEach(r => {
      this._onResult(r.dimension, r.data);
    });
  }

  public setRange(dimension: Dimension, range: Interval) {
    this.setActiveDimension(dimension);

    if (debugging.logApi) {
      console.log(`API: setRange ${dimension.name} ${range}`);
    }

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
    this.setActiveDimension(dimension);

    const scale = this.scales[this.activeDimension];
    const index = Math.round(scale(value));

    if (debugging.logApi) {
      console.log(`API: load ${this.activeDimension} ${index}`);
    }

    this.connection.send({
      type: 'load',
      dimension: this.activeDimension,
      value: index
    });
  }

  // Call this when you want to suggest how the
  // server should prioritize background queries.
  public preload(dimension: Dimension, value: number | number[], velocity: number) {
    this.setActiveDimension(dimension);

    const scale = this.scales[this.activeDimension];
    let index;
    if (Array.isArray(value)) {
      index = value.map((v) => Math.round(scale(v)));
    } else {
      index = Math.round(scale(value));
    }

    if (debugging.logApi) {
      console.log(`API: preload ${this.activeDimension} idx: ${index} v: ${velocity}`);
    }

    this.connection.send({
      type: 'preload',
      dimension: this.activeDimension,
      value: index,
      velocity: velocity
    });
  }

  public onResult(callback: (dimension: string, data: number[], range: Interval) => any) {
    this._onResult = callback;
    return (result: Result) => {
      console.log(result);

      // Ignore results from stale queries (wrong dimension)
      if (result.activeDimension === this.activeDimension) {
        this.cache.set(result.index, result.dimension, result.data);

        // This attempts to see if the new result is what
        // the brush is set to now, and if so, updates it.
        const range = this.ranges[this.activeDimension];
        const scale = this.scales[this.activeDimension];
        const scaledRange = range.map(d => Math.round(scale(d)));

        const data = this.cache.getCombined(scaledRange[0], scaledRange[1], result.dimension);
        if (data) {
          return callback(result.dimension, data.data, data.range);
        }
      }
    };
  }

  private setActiveDimension(dimension: Dimension) {
    if (this.activeDimension !== dimension.name) {
      // Clear cache because we only cache 1 dimension at a time.
      this.cache.invalidate();
    }

    this.activeDimension = dimension.name;
  }

  public getRange(dimension: Dimension) {
    return this.ranges[dimension.name];
  }
}

export default API;
