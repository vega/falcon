import { View } from "vega-lib";
import { Logger } from "../api";

/**
 * Simple example logger to demonstarte the approach.
 */
export class SimpleLogger<V extends string> implements Logger<V> {
  public attach(name: V, view: View) {
    console.log(view["_spec"]);
    console.log({
      origin: view.origin(),
      width: view.width(),
      height: view.height(),
      clientWidth: view.container()!.clientWidth,
      clientHeight: view.container()!.clientHeight,
      container: view.container()
    });

    view.addEventListener("mouseenter", _ => {
      console.log({
        view: name,
        name: "mouseenter"
      });
    });

    view.addEventListener("mouseleave", _ => {
      console.log({
        view: name,
        name: "mouseleave"
      });
    });

    view.addSignalListener("brushMouse", (_, value) => {
      // filter events that are in the wrong chart
      const brushRange = view.signal("brush");
      const pixBrushRange = view.signal("pixelBrush");
      console.log({
        view: name,
        name: value === 1 ? "brushStart" : "brushEnd",
        brush: brushRange[0],
        pixBrush: pixBrushRange[0]
      });
    });

    view.addSignalListener("brush", (_, brushRange) => {
      const pixBrushRange = view.signal("pixelBrush");
      console.log({
        view: name,
        name: "brush",
        brushStart: brushRange[0],
        brushEnd: brushRange[1],
        pixBrushStart: pixBrushRange[0],
        pixBrushEnd: pixBrushRange[1]
      });
    });
  }
}
