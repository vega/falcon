import { Backend } from './backend';

class Session {

  constructor(public backend: Backend) {

  }

  // Return the initial queries back to the client
  init() {
    
  }

  preload(dimension: string, value: number, velocity: number) {

  }

  setRange(dimension: string, range: Range) {

  }

  load(dimension: string, value: number) {

  }
}


export default Session;
