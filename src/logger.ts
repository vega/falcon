import { View } from "vega-lib";

interface Record {
  name: string;
  timestamp: number;
  brushStart: number;
  brushEnd: number;
  pixBrushStart: number;
  pixBrushEnd: number;
}

export class Logger {
  static maxtries = 3; // maximum # of tries to send things to server
  logContainer: Array<any>;
  stagingContainer: Array<any>;
  userid: string;
  taskid: string;
  logUrl: string;

  /**
   * Constructs the logger
   */
  constructor(userid: string, taskid: string, logUrl: string) {
    this.logContainer = [];
    this.userid = userid;
    this.taskid = taskid;
    this.logUrl = logUrl;

    // TODO: start a periodic ten second process to ship stuff
  }

  /**
   * Attach loggin to the vega view.
   */
  public attach(view: View) {
    let self = this;
    view.addSignalListener("brush", (name, brushRange) => {
      let timestamp = Date.now();
      let pixBrushRange = view.signal("pixelBrush");
      self.appendToLog({
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
    var tries = 0;
    let self = this;
    let doFetch = function() {
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
