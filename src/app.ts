import { select, range, histogram, Selection, BaseType } from "d3";
import { createHistogramView, createHeatmapView } from "./view";
import { stepSize, duplicate, throttle, is1DView } from "./util";
import { DataBase } from "./db";
import { View as VgView, changeset } from "vega";

export class App {
  private activeView: string;
  private vegaViews = new Map<string, VgView>();
  private brushes = new Map<string, Interval<number>>();

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
        if (is1DView(view)) {
          const step = stepSize(view.domain, view.bins);
          const bins = range(view.domain[0], view.domain[1] + step, step);
          const vegaView = createHistogramView(
            select(this).node() as Element,
            view.dimension,
            step,
            bins,
            view.domain
          );

          const data = self.db.histogram(view.name, view.bins, view.domain);

          vegaView.insert("table", data).run();

          // attach listener for brush changes
          vegaView.addSignalListener("range", (name, value) => {
            self.brushMove(view.name, view.dimension, value);
          });

          self.vegaViews.set(view.name, vegaView);
        } else {
          const stepX = stepSize(view.domains[0], view.bins[0]);
          const stepY = stepSize(view.domains[1], view.bins[1]);
          const binsX = range(
            view.domains[0][0],
            view.domains[0][1] + stepX,
            stepX
          );
          const binsY = range(
            view.domains[1][0],
            view.domains[1][1] + stepY,
            stepY
          );

          const vegaView = createHeatmapView(
            select(this).node() as Element,
            view.dimensions,
            [stepX, stepY],
            [binsX, binsY],
            view.domains
          );

          const data = self.db.heatmap(view.name, view.bins, view.domains);

          vegaView.insert("table", data).run();

          vegaView.addSignalListener("rangeX", console.log);
          vegaView.addSignalListener("rangeY", console.log);

          // vegaView.addSignalListener("rangeX", (name, value) =>
          //   self.brushMove(view.name, view.dimensions[0], value)
          // );
          // vegaView.addSignalListener("rangeY", (name, value) =>
          //   self.brushMove(view.name, view.dimensions[1], value)
          // );

          self.vegaViews.set(view.name, vegaView);
        }
      });

    // this.update();
  }

  private switchActiveView(name: string) {
    console.log(`Active view ${this.activeView} => ${name}`);
    this.activeView = name;
  }

  private brushMove(name: string, dimension: string, value: [number, number]) {
    if (this.activeView !== name) {
      this.switchActiveView(name);
    }

    // set brush
    this.brushes.set(dimension, value);

    // set filter in crossfilter lib
    this.db.dims[`${name};${dimension}`].filterRange(value);

    this.update();
  }

  private update() {
    for (const view of this.views) {
      if (is1DView(view)) {
        const data = this.db.histogram(view.name, view.bins, view.domain);

        const changeSet = changeset()
          .remove(() => true)
          .insert(data);

        const vgView = this.vegaViews.get(view.name)!;
        vgView.runAfter(() => {
          vgView.change("table", changeSet).run();
        });
      } else {
        const data = this.db.heatmap(view.name, view.bins, view.domains);

        const changeSet = changeset()
          .remove(() => true)
          .insert(data);

        const vgView = this.vegaViews.get(view.name)!;
        vgView.runAfter(() => {
          vgView.change("table", changeSet).run();
        });
      }
    }
  }
}
