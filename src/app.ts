import { select, range, histogram } from "d3";
import { createView } from "./view";
import { stepSize } from "./util";

const VIEWS: View[] = [
  {
    bins: 25,
    dimension: "ARR_DELAY",
    name: "ARR_DELAY",
    range: [-10, 100],
    title: "Arrival Delay",
    type: "1D"
  },
  {
    bins: 25,
    dimension: "DISTANCE",
    name: "DISTANCE",
    range: [50, 2000],
    title: "Distance",
    type: "1D"
  },
  {
    bins: 25,
    dimension: "DEP_DELAY",
    name: "DEP_DELAY",
    range: [-10, 100],
    title: "Departure Delay",
    type: "1D"
  }
];

export function app(data: { [name: string]: any[] }) {
  const app = select("#app");

  // add for now to clear the view
  (app.node() as any).innerHTML = "";

  console.log(data);

  app
    .selectAll(".view")
    .data(VIEWS)
    .enter()
    .append("div")
    .attr("class", "view")
    .each(function(view: View) {
      const step = stepSize(view.range, view.bins);
      const bins = range(view.range[0], view.range[1] + step, step);

      const vegaView = createView(
        select(this).node() as Element,
        view.title,
        step,
        bins
      );

      vegaView.addSignalListener(
        "pixelRange",
        (name: string, value: [number, number]) => {
          console.log(name, value);
        }
      );

      const hist = histogram()
        .domain(view.range)
        .thresholds(bins)(data[view.name])
        .map(d => d.length);

      vegaView
        .insert(
          "table",
          hist.map((d, i) => ({
            value: bins[i],
            count: d
          }))
        )
        .run();
    });
}
