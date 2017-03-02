import {debugging} from '../config';
import {Connection} from './ws';

class API {
  constructor(public connection: Connection) {
  }

  /**
   * Initialize sizes and get initial data.
   */
  public init(request: Init) {
    this.send(Object.assign({}, { type: 'init' },  request) as ApiRequest);
  }

  // Call this when you want to request a value
  // to be computed immediately.
  public load(request: Load) {
    this.send(Object.assign({}, { type: 'load' },  request) as ApiRequest);
  }

  // Call this when you want to suggest how the
  // server should prioritize background queries.
  public preload(request: Preload) {
    this.send(Object.assign({}, { type: 'preload' },  request) as ApiRequest);
  }

  /**
   * Send an arbitrary requet to the server.
   */
  public send(request: ApiRequest) {
    if (debugging.logApi) {
      console.log(`API: ${request.type}`, request);
    }

    this.connection.send(request);
  }

  public onResult(callback: (result: Result) => void) {
    this.connection.onResult((r: Result) => {
      if (debugging.logApi) {
        console.log(`API: received result`, r);
      }
      callback(r);
    });
  }
}

export default API;
