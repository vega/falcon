
import BrushableBar from './viz/brushable-bar';


class API {

  private cache: any = {};
  private activeDimension: string;
  private ranges: any = {};
  private _onResults: any;

  constructor(public dimensions: Dimension[], public connection: any) {
    this.activeDimension = dimensions[0].name;
    dimensions.forEach(dimension => {
      this.ranges[dimension.name] = dimension.range;
    });
  }

  public setState(dimension: Dimension, range: Interval) {

    if (this.activeDimension !== dimension.name) {
      // Only cache 1 dimension at a time.
      this.cache = {};
    }

    if (this.cache[range.toString()]) {
      // Cache hit
      Object.keys(this.cache[range.toString()]).forEach((dim) => {
        const data = this.cache[range.toString()][dim];
        this._onResults && this._onResults({
          dimension: dim,
          data: data
        });
      });
    } else {
      // Request result from server
      this.connection.send({
        type: 'setRange',
        dimension: dimension.name,
        range: range
      });
    }

    this.activeDimension = dimension.name;
    this.ranges[dimension.name] = range;
  }

  public onResults(callback: (results) => any) {
    this.onResults = callback;
    return (results) => {
      console.log(results);
      if (results.activeDimension === this.activeDimension) {
        if (!this.cache[results.range]) {
          this.cache[results.range] = {};
        }
        this.cache[results.range][results.dimension] = results.data;

        const r1 = results.range;
        const r2 = this.ranges[this.activeDimension];
        if (r1[0] === r2[0] && r1[1] && r2[1]) {
          callback(results);
        }
      }
    };
  }


}

export default API;
