import { View } from "vega-lib";
import { throttle } from "./util";

interface Record {
  view: string;
  name: string;
  timestamp: number;
  brushStart: number;
  brushEnd: number;
  pixBrushStart: number;
  pixBrushEnd: number;
}

interface MouseRecord {
  name: string;
  timestamp: number;
  pageX: number;
  pageY: number;
}

export class Logger<V extends string> {
  private static maxtries = 3; // maximum # of tries to send things to server
  private logContainer: Array<Record>;
  private stagingContainer: Array<Record>;

  private mouseLogContainer: Array<MouseRecord>;
  private stagingMouseContainer: Array<MouseRecord>;

  /**
   * Constructs the logger
   */
  constructor(
    private userid?: string,
    private taskid?: string,
    private logUrl?: string
  ) {
    this.logContainer = [];
    this.stagingContainer = [];
    this.mouseLogContainer = [];
    this.stagingMouseContainer = [];
    this.userid = userid;
    this.taskid = taskid;
    this.logUrl = logUrl;

    document.onmousemove = throttle(this.trackMouse(), 50);
    // TODO: start a periodic ten second process to ship stuff
    setInterval(this.writeToLog(), 10000);
  }

  /* 
  * track global mouse position
  */
  private trackMouse() {
    const self = this;
    return function(event) {
      self.appendToMouseLog({
        timestamp: Date.now(),
        name: "mouse",
        pageX: event.pageX,
        pageY: event.pageY
      });
    };
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

  public appendToMouseLog(record: MouseRecord) {
    this.mouseLogContainer.push(record);
  }

  public writeToLog() {
    const self = this;
    return function() {
      //move from log container to staging container
      self.stagingContainer.push(
        ...self.logContainer.splice(0, self.logContainer.length)
      );

      self.stagingMouseContainer.push(
        ...self.mouseLogContainer.splice(0, self.mouseLogContainer.length)
      );

      if (
        self.stagingContainer.length === 0 &&
        self.stagingMouseContainer.length === 0
      ) {
        return;
      }
      console.log("writing to server...");
      // send contents to server
      let tries = 0;
      const doFetch = function() {
        fetch(self.logUrl, {
          body: JSON.stringify({
            userid: self.userid,
            taskid: self.taskid,
            log: self.stagingContainer,
            mouseLog: self.stagingMouseContainer
          }),
          headers: { "Content-Type": "application/json" },
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
      doFetch();
    };
  }
}
