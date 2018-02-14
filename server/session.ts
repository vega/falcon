import { scaleLinear } from 'd3';
import * as config from '../shared/config';
import { clamp } from '../shared/util';
import Flights from './flight-backend';

export type Callback = (response: ApiResult) => void;

class Session {
  private closed: boolean = false;
  private sizes: Sizes = {};

  private _onQuery: Callback;

  constructor(public readonly backend: Flights) { }

  public onQuery(cb: Callback) {
    this._onQuery = cb;
  }

  // Set the sizes of the charts and initialize the session.
  public init(request: Init) {
    this.sizes = request.sizes;

    const data = this.backend.load(request, this.sizes);
    if (this.closed) {
      console.warn('Session closed.');
    }

    const stepSize = 1;
    this._onQuery({request, stepSize, data});
  }

  public close() {
    this.closed = true;
  }

  // Load a particular value immediately.
  public load(request: Load) {
    const data = this.backend.loadAll(request, this.sizes);

    if (this.closed) {
      console.warn('Session closed.');
    }

    this._onQuery({request, data});
  }
}

export default Session;
