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
  private logContainer: Record[] = [];
  private stagingContainer: Record[] = [];

  private mouseLogContainer: MouseRecord[] = [];
  private stagingMouseContainer: MouseRecord[] = [];
  private intervalHandler;

  /**
   * Constructs the logger
   */
  constructor(
    private userid?: string,
    private taskid?: string,
    private logUrl?: string
  ) {
    document.onmousemove = throttle(this.trackMouse.bind(this), 50);
    this.intervalHandler = setInterval(this.writeToLog.bind(this), 10000);
  }

  /*
  * track global mouse position
  */
  private trackMouse(event) {
    this.appendToMouseLog({
      timestamp: Date.now(),
      name: "mouse",
      pageX: event.pageX,
      pageY: event.pageY
    });
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
    // abort if the we are sending stuff right now
    if (
      this.stagingContainer.length + this.stagingMouseContainer.length !==
      0
    ) {
      console.log(
        "Cannot send new logs because we are in the process of sending some data."
      );
      return;
    }

    //move from log container to staging container
    this.stagingContainer = this.logContainer;
    this.stagingMouseContainer = this.mouseLogContainer;

    if (
      this.stagingContainer.length + this.stagingMouseContainer.length ===
      0
    ) {
      // no need to send anything
      return;
    }

    console.log("Sending logs.");
    // send contents to server
    let tries = 0;
    const doFetch = () => {
      fetch(this.logUrl, {
        body: JSON.stringify({
          userid: this.userid,
          taskid: this.taskid,
          log: this.stagingContainer,
          mouseLog: this.stagingMouseContainer
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      })
        .then(response => {
          if (response.ok) {
            this.stagingContainer = [];
            this.stagingMouseContainer = [];
          } else {
            tries++;
            if (tries < Logger.maxtries) {
              console.log(
                `Sending logs failed. Trying again (${tries}/${
                  Logger.maxtries
                }).`
              );
              doFetch();
            } else {
              clearInterval(this.intervalHandler);
              throw "Reached maximum limit of resends: " + response.statusText;
            }
          }
        })
        .catch(error => {
          clearInterval(this.intervalHandler);
          throw error;
        });
    };
    doFetch();
  }
}
