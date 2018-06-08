import { select, range, histogram, Selection, BaseType } from "d3";
import { createView } from "./view";
import { stepSize } from "./util";

export class App {
  public constructor(
    private el: Selection<BaseType, {}, HTMLElement, any>,
    private views: View[],
    private data: { [name: string]: any[] }
  ) {
    console.log(data);
    this.initialize();
  }

  private initialize() {
    const data = this.data;
    this.el
      .selectAll(".view")
      .data(this.views)
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
}
