import {debugging} from '../config';

class API {
  constructor(public connection: any) {
  }

  public init(request: Init) {
    if (debugging.logApi) {
      console.log(`API: init`, request);
    }

    this.connection.send(request);
  }

  // Call this when you want to request a value
  // to be computed immediately.
  public load(request: Load) {
    if (debugging.logApi) {
      console.log(`API: load`, request);
    }

    this.connection.send(request);
  }

  // Call this when you want to suggest how the
  // server should prioritize background queries.
  public preload(request: Preload) {
    if (debugging.logApi) {
      console.log(`API: preload`, request);
    }

    this.connection.send(request);
  }

  public send(request: Preload | Load | Init) {
    this.connection.send(request);
  }

  public onResult(callback: (result: Result) => void) {
    this.connection.onResult(callback);
  }
}

export default API;
