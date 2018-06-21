import { View } from "vega-lib";

export class Logger {
  /**
   * Constructs the logger
   */
  constructor() {}

  public attach(view: View) {
    view.addSignalListener("brush", console.log);
  }
}
