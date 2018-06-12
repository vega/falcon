import { select, range, histogram, Selection, BaseType } from "d3";
import { createHistogramView, createHeatmapView } from "./view";
import { stepSize, duplicate, throttle, is1DView } from "./util";
import { DataBase } from "./db";
import { View as VgView, changeset } from "vega";

export class App {
  private activeView: string;
  private vegaViews: { [name: string]: VgView } = {};
  private viewIndex = {};
  private views1D: View1D[];
  private views2D: View2D[];

  public constructor(
    private el: Selection<BaseType, {}, HTMLElement, any>,
    private views: View[],
    private db: DataBase
  ) {
    this.activeView = views[0].name;

    views.forEach((view, idx) => {
      this.viewIndex[view.name] = idx;
    });

    this.views1D = views.filter(v => is1DView(v)) as View1D[];
    this.views2D = views.filter(v => !is1DView(v)) as View2D[];

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
          const step = stepSize(view.range, view.bins);
          const bins = range(view.range[0], view.range[1] + step, step);
          const vegaView = createHistogramView(
            select(this).node() as Element,
            view.dimension,
            step,
            bins,
            view.range
          );

          const data = self.db.histogram(view.name, view.bins, view.range);

          vegaView.insert("table", data).run();

          // attach listener for brush changes
          vegaView.addSignalListener("range", (name, value) => {
            self.brushMove(view.name, view.dimension, value);
          });

          self.vegaViews[view.name] = vegaView;
        } else {
          const stepX = stepSize(view.ranges[0], view.bins[0]);
          const stepY = stepSize(view.ranges[1], view.bins[1]);
          const binsX = range(
            view.ranges[0][0],
            view.ranges[0][1] + stepX,
            stepX
          );
          const binsY = range(
            view.ranges[1][0],
            view.ranges[1][1] + stepY,
            stepY
          );

          const vegaView = createHeatmapView(
            select(this).node() as Element,
            view.dimensions,
            [stepX, stepY],
            [binsX, binsY],
            view.ranges
          );

          const data = self.db.heatmap(view.name, view.bins, view.ranges);

          vegaView.insert("table", data).run();

          // vegaView.addSignalListener("rangeX", console.log);
          // vegaView.addSignalListener("rangeY", console.log);

          vegaView.addSignalListener("rangeX", (name, value) =>
            self.brushMove(view.name, view.dimensions[0], value)
          );
          vegaView.addSignalListener("rangeY", (name, value) =>
            self.brushMove(view.name, view.dimensions[1], value)
          );

          self.vegaViews[view.name] = vegaView;
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
    // this.views1D[this.viewIndex[name]].brush = value;

    // set filter in crossfilter lib
    this.db.dims[`${name};${dimension}`].filterRange(value);

    this.update();
  }

  private update() {
    for (const view of this.views) {
      if (is1DView(view)) {
        const data = this.db.histogram(view.name, view.bins, view.range);

        const changeSet = changeset()
          .remove(() => true)
          .insert(data);

        this.vegaViews[view.name].runAfter(() => {
          this.vegaViews[view.name].change("table", changeSet).run();
        });
      } else {
        const data = this.db.heatmap(view.name, view.bins, view.ranges);

        const changeSet = changeset()
          .remove(() => true)
          .insert(data);

        this.vegaViews[view.name].runAfter(() => {
          this.vegaViews[view.name].change("table", changeSet).run();
        });
      }
    }
  }
}
