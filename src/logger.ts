import { View } from "vega-lib";

export class Logger {
  /**
   * Constructs the logger
   */
  constructor() {}

  /**
   * Attach loggin to the vega view.
   */
  public attach(view: View) {
    view.addSignalListener("brush", console.log);
  }
}
