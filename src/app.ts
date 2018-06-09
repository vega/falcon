import { select, range, histogram, Selection, BaseType } from "d3";
import { createView } from "./view";
import { stepSize, duplicate, throttle } from "./util";
import { DataBase } from "./db";
import { View as VgView, changeset } from "vega";

export class App {
  private activeView: string;
  private vegaViews: { [name: string]: VgView } = {};

  public constructor(
    private el: Selection<BaseType, {}, HTMLElement, any>,
    private views: View[],
    private db: DataBase
  ) {
    this.activeView = views[0].name;

    this.initialize();
  }

  private initialize() {
    const self = this;
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

        const data = self.db
          .histogram(view.name, view.bins, view.range)
          .map((d, i) => ({
            value: bins[i],
            count: d
          }));

        vegaView.insert("table", data).run();

        // attach listener for brush changes
        vegaView.addSignalListener("pixelRange", (name, value) => {
          self.brushMovePixel(view.name, value);
        });

        self.vegaViews[view.name] = vegaView;
      });

    // this.update();
  }

  private switchActiveView(name: string) {
    console.log(`Active view ${this.activeView} => ${name}`);
    this.activeView = name;
  }

  private brushMovePixel(name: string, value: [number, number]) {
    if (this.activeView !== name) {
      this.switchActiveView(name);
    }

    // console.log(name, value);

    this.throttledUpdate();
  }

  private throttledUpdate = throttle(this.update, 100);

  private update() {
    for (const view of this.views) {
      const brush = this.vegaViews[view.name].signal("range");
      if (brush) {
        view.brush = brush;
      }
    }

    const newHists = this.db.filteredHistograms(this.views);

    for (const view of this.views) {
      const step = stepSize(view.range, view.bins);
      const bins = range(view.range[0], view.range[1] + step, step);

      const data = bins.map((bin, i) => ({
        value: bin,
        value_end: bin + step,
        count: newHists[view.name][i] || 0
      }));

      const changeSet = changeset()
        .remove(() => true)
        .insert(data);

      this.vegaViews[view.name].change("table", changeSet).run();
    }
  }
}
