
import BrushableBar from './viz/brushable-bar';
import * as d3 from 'd3';

class API {

  private cache: any = [];
  private activeDimension: string;
  private ranges: any = {};
  private _onResult: any;
  private scales: any = {};

  constructor(public dimensions: Dimension[], public connection: any) {
    this.activeDimension = dimensions[0].name;
    dimensions.forEach(dimension => {
      this.ranges[dimension.name] = dimension.range;
      this.scales[dimension.name] = d3.scale.linear().domain(dimension.range).range([0, 100]);
    });
  }

  public init(resolutions: { dimension: string, value: number }[]) {
    resolutions.forEach((resolution) => {
      const dimension = this.dimensions.find(d => d.name === resolution.dimension);
      if (dimension) {
        this.scales[dimension.name] = d3.scale.linear().domain(dimension.range).range([0, resolution.value]);
      } 
    });

    this.connection.send({
      type: 'init',
      resolutions: resolutions
    });

  }

  public setState(dimension: Dimension, range: Interval) {

    if (this.activeDimension !== dimension.name) {
      // Only cache 1 dimension at a time.
      this.cache = [];
    }

    this.activeDimension = dimension.name;

    // Convert the range to cache index:
    const scale = this.scales[this.activeDimension];

    const scaledRange = range.map((d) => Math.round(scale(d)));
    if (this.cache[scaledRange[0]] && this.cache[scaledRange[1]]) {
      // cache hit
      Object.keys(this.cache[scaledRange[1]]).forEach((dim) => {
        if (!this.cache[scale[0]][dim]) {
          return;
        }

        // TODO - refactor this so the logic isn't repeated in 2 places.
        const higher = d3.nest().key((d: any) => d.bucket).map(this.cache[scaledRange[1]][dim]);
        const lower = d3.nest().key((d: any) => d.bucket).map(this.cache[scaledRange[0]][dim]);

        const data = Object.keys(higher).map((bucket) => {
          const hCount = +higher[bucket][0].count;
          const lCount = lower[bucket] ? +lower[bucket][0].count : 0;
          return {
            bucket: +bucket,
            count: hCount - lCount
          };
        });

        if (this._onResult) {
          this._onResult({
            dimension: dim,
            data: data
          });
        }
      })
    } else {
      this.connection.send({
        type: 'load',
        dimension: dimension.name,
        value: scaledRange[0]
      });
      this.connection.send({
        type: 'load',
        dimension: dimension.name,
        value: scaledRange[1]
      });
    }

    this.activeDimension = dimension.name;
    this.ranges[dimension.name] = range;
  }

  public onResult(callback: (dimension: string, data: { bucket: number, count: number }[]) => any) {
    this._onResult = callback;
    return (result) => {
      // Ignore results from stale queries (wrong dimension)
      if (result.activeDimension === this.activeDimension) {
        if (!this.cache[result.index]) {
          this.cache[result.index] = {};
        }
        this.cache[result.index][result.dimension] = result.data;
        
        const range = this.ranges[this.activeDimension];
        const scale = this.scales[this.activeDimension];
        const scaledRange = range.map(d => Math.round(scale(d)));

        const c0 = this.cache[scaledRange[0]];
        const c1 =  this.cache[scaledRange[1]];
        if (c0 && c0[result.dimension] && c1 && c1[result.dimension]) {

          // TODO - refactor this so the logic isn't repeated in 2 places.
          const higher = d3.nest().key((d: any) => d.bucket).map(c1[result.dimension]);
          const lower = d3.nest().key((d: any) => d.bucket).map(c0[result.dimension]);

          const data = Object.keys(higher).map((bucket) => {
            const hCount = +higher[bucket][0].count;
            const lCount = lower[bucket] ? +lower[bucket][0].count : 0;
            return {
              bucket: +bucket,
              count: hCount - lCount
            };
          });
          
          callback(result.dimension, data);
        }
      }
    };
  }


}

export default API;
