import { View } from "vega-lib";

interface Record {
  view: string;
  name: string;
  timestamp: number;
  brushStart: number;
  brushEnd: number;
  pixBrushStart: number;
  pixBrushEnd: number;
}

export class Logger<V extends string> {
  private static maxtries = 3; // maximum # of tries to send things to server
  private logContainer: Array<any>;
  private stagingContainer: Array<any>;

  /**
   * Constructs the logger
   */
  constructor(
    private userid?: string,
    private taskid?: string,
    private logUrl?: string
  ) {
    this.logContainer = [];

    // TODO: start a periodic ten second process to ship stuff
  }

  /**
   * Attach loggin to the vega view.
   */
  public attach(name: V, view: View) {
    const self = this;
    view.addSignalListener("brush", (_, brushRange) => {
      const timestamp = Date.now();
      const pixBrushRange = view.signal("pixelBrush");
      self.appendToLog({
        view: name,
        name: "brush",
        timestamp: timestamp,
        brushStart: brushRange[0],
        brushEnd: brushRange[1],
        pixBrushStart: pixBrushRange[0],
        pixBrushEnd: pixBrushRange[1]
      });
    });
  }

  public appendToLog(record: Record) {
    this.logContainer.push(record);
  }

  public writeToLog() {
    //move from log container to staging container
    this.stagingContainer.push(
      ...this.logContainer.splice(0, this.logContainer.length)
    );

    if (this.stagingContainer.length === 0) {
      return;
    }

    // send contents to server
    let tries = 0;
    const self = this;
    const doFetch = function() {
      fetch(self.logUrl, {
        body: JSON.stringify(self.stagingContainer),
        method: "POST"
      }).then(response => {
        if (response.status !== 200) {
          // FAIL
          tries++;
          if (tries < Logger.maxtries) {
            doFetch();
          } else {
            throw response.status;
          }
        } else {
          // PASS
          self.stagingContainer = [];
        }
      });
    };
  }
}
