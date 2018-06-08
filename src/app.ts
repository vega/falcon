import { select } from "d3";
import { createView } from "./view";

const VIEWS = [
  {
    title: "first",
    range: [0, 100],
    bins: 25
  },
  {
    title: "second",
    range: [0, 100],
    bins: 25
  }
];

export function app(data) {
  console.log(data.length);

  const app = select("#app");

  for (const view of VIEWS) {
    const el = app.append("div").attr("class", "view");
    const vegaView = createView(el, view);

    vegaView.addSignalListener(
      "pixelRange",
      (name: string, value: [number, number]) => {
        console.log(name, value);
      }
    );

    vegaView.insert("table", []).run();
  }
}
