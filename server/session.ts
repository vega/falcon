import { Backend } from './backend';

class Session {

  private activeDimension: string;
  private _onQuery: (activeDimension: Dimension, dimension: string, results: any) => any;

  constructor(public backend: Backend, public dimensions: Dimension[]) {
    this.activeDimension = dimensions[0].name;
    // this.dimensions.forEach(dimension => {
    //   dimension.initialRange = dimension.range;
    // });
  }
  
  private getPredicates() {
    return this.getStaticDimensions(); 
  }

  private getActiveDimension() {
    return this.dimensions.find(d => d.name === this.activeDimension) || this.dimensions[0];
  }

  private getStaticDimensions() {
    return this.dimensions.filter(dimension => dimension.name !== this.activeDimension);
  }

  // Return the initial queries back to the client
  public init() {
    const ad = this.getActiveDimension();

    this.dimensions.forEach((dimension) => {
      this.backend
        .query(dimension.name, this.getPredicates())
        .then((results) => {
          this._onQuery && this._onQuery(ad, dimension.name, results);
        });
    });
  }

  public onQuery(cb: (activeDimension: Dimension, dimension: string, results: any) => any) {
    this._onQuery = cb;
  }

  public preload(dimension: string, value: number, velocity: number) {

  }

  public setRange(dimension: string, range: Interval) {
    this.activeDimension = dimension;
    const ad = this.getActiveDimension(); 
    ad.range = range;
    this.getStaticDimensions().forEach((dimension) => {
      this.backend
        .query(dimension.name, this.getPredicates())
        .then((results) => {
          this._onQuery && this._onQuery(ad, dimension.name, results);
        });
    });

  }

  public load(dimension: string, value: number) {

  }
}


export default Session;
