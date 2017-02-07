import {debugging} from '../config';
import {Cache} from './cache';

class API {

  public cache: Cache;
  private _onResult: any;
  private hasUserBrushed: boolean = false;

  constructor(public views: View[], public connection: any) {
  }


  public init(request: Init) {
    if (debugging.logApi) {
      console.log(`API: init ${request}`);
    }

    this.connection.send(request);
  }

  // Call this when you want to request a value
  // to be computed immediately.
  public load(request: Load) {
    this.hasUserBrushed = true;

    if (debugging.logApi) {
      console.log(`API: load ${request}`);
    }

    this.connection.send(request);
  }

  // Call this when you want to suggest how the
  // server should prioritize background queries.
  public preload(request: Preload) {
    if (debugging.logApi) {
      console.log(`API: preload ${request}`);
    }

    this.connection.send(request);
  }

  public onResult(callback: (dimension: string, data: number[], rangeError: number) => any) {
    this._onResult = callback;
    return (result: Result) => {
      console.log(result);
    };
  }
}

export default API;
