import {debugging} from '../config';
import {Connection} from './ws';

class API {
  constructor(public connection: Connection) {
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
