import { Backend } from './backend';

class Session {

  private activeDimension: string;
  private _onQuery: (dimension: string, results: any) => any;

  constructor(public backend: Backend, public dimensions: Dimension[]) {
    this.activeDimension = dimensions[0].name;
  }
  
  private getPredicates() {
    return this.dimensions
      .filter(dimension => dimension.name !== this.activeDimension);
  }

  // Return the initial queries back to the client
  public init() {
    this.dimensions.forEach((dimension) => {
      this.backend
        .query(dimension.name, this.getPredicates())
        .then((results) => {
          this._onQuery && this._onQuery(dimension.name, results);
        });
    });
  }

  public onQuery(cb: (dimension: string, results: any) => any) {
    this._onQuery = cb;
  }

  public preload(dimension: string, value: number, velocity: number) {

  }

  public setRange(dimension: string, range: Interval) {

  }

  public load(dimension: string, value: number) {

  }
}


export default Session;
