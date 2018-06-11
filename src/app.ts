import { select, range, histogram, Selection, BaseType } from "d3";
import { createView } from "./view";
import { stepSize, duplicate, throttle } from "./util";
import { DataBase } from "./db";
import { View as VgView, changeset } from "vega";

export class App {
  private activeView: string;
  private vegaViews: { [name: string]: VgView } = {};
  private viewIndex = {};

  public constructor(
    private el: Selection<BaseType, {}, HTMLElement, any>,
    private views: View[],
    private db: DataBase
  ) {
    this.activeView = views[0].name;

    views.forEach((view, idx) => {
      this.viewIndex[view.name] = idx;
    });

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

        const data = self.db.histogram(view.name, view.bins, view.range);

        vegaView.insert("table", data).run();

        // attach listener for brush changes
        vegaView.addSignalListener("range", (name, value) => {
          self.brushMove(view.name, value);
        });

        self.vegaViews[view.name] = vegaView;
      });

    // this.update();
  }

  private switchActiveView(name: string) {
    console.log(`Active view ${this.activeView} => ${name}`);
    this.activeView = name;
  }

  private brushMove(name: string, value: [number, number]) {
    if (this.activeView !== name) {
      this.switchActiveView(name);
    }

    // set brush
    this.views[this.viewIndex[name]].brush = value;

    // set filter in crossfilter lib
    this.db.dims[name].filterRange(value);

    this.update();
  }

  private update() {
    for (const view of this.views) {
      const data = this.db.histogram(view.name, view.bins, view.range);

      const changeSet = changeset()
        .remove(() => true)
        .insert(data);

      this.vegaViews[view.name].change("table", changeSet).run();
    }
  }
}
