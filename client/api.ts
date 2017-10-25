import {debugging} from '../shared/config';
import {Connection} from './ws';

export default class API {
  constructor(public connection: Connection) {}

  /**
   * Send an arbitrary request to the server.
   */
  public send(request: ApiRequest) {
    if (debugging.logApi) {
      console.info(`API: ${request.type}`, request);
    }

    this.connection.send(request);
  }

  public onResult(callback: (result: Result) => void) {
    this.connection.onResult((r: Result) => {
      if (debugging.logApi) {
        console.info(`API: received result`, r);
      }
      callback(r);
    });
  }
}
