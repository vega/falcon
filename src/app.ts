import { BaseType, select, Selection } from "d3";
import { View as VgView, changeset } from "vega";
import { DataBase } from "./db";
import {
  bin,
  is1DView,
  diff,
  binNumberFunction,
  stepSize,
  clamp,
  binToData
} from "./util";
import { CHART_WIDTH, createHistogramView } from "./view";

export class App {
  private activeView: string;
  private vegaViews = new Map<string, VgView>();
  private brushes = new Map<string, Interval<number>>();
  private viewIndex = new Map<string, number>();
  private data: ResultCube;
  private needsUpdate = false;

  public constructor(
    private el: Selection<BaseType, {}, HTMLElement, any>,
    private views: View[],
    private db: DataBase
  ) {
    views.forEach((view, idx) => {
      this.viewIndex.set(view.name, idx);
    });

    // this.activeView = views[0].name;
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
          const binConfig = bin({ maxbins: view.bins, extent: view.extent });
          const vegaView = createHistogramView(
            select(this).node() as Element,
            view.dimension,
            binConfig
          );

          const data = self.db.histogram(view.name, binConfig);

          vegaView.insert("table", data).run();

          // attach listener for brush changes
          vegaView.addSignalListener("range", (_name, value) => {
            self.brushMove(view.name, view.dimension, value);
          });

          self.vegaViews.set(view.name, vegaView);
        } else {
          // TODO
        }
      });
  }

  private switchActiveView(name: string) {
    console.log(`Active view ${this.activeView} => ${name}`);
    this.activeView = name;

    const activeView = this.getActiveView();

    const brushes = new Map(this.brushes);
    if (is1DView(activeView)) {
      brushes.delete(activeView.dimension);
    }

    this.data = this.db.loadData(
      activeView as View1D,
      CHART_WIDTH,
      this.views.filter(v => v.name !== name),
      brushes
    );
  }

  private brushMove(name: string, dimension: string, value: [number, number]) {
    if (this.activeView !== name) {
      this.switchActiveView(name);
    }

    // delete or set brush
    if (!value) {
      this.brushes.delete(dimension);
    } else {
      this.brushes.set(dimension, value);
    }

    this.needsUpdate = true;
    window.requestAnimationFrame(() => {
      this.update();
    });
  }

  private getActiveView(): View1D {
    return this.views[this.viewIndex.get(this.activeView)!] as View1D;
  }

  private getResult(name: string, index: number) {
    const dimensionEntry = this.data.get(name)!;
    for (let i = index; i >= 0; i--) {
      const result = dimensionEntry[i];
      if (result) {
        return result;
      }
    }
    throw Error("Could not find any data");
  }

  private update() {
    if (!this.needsUpdate) {
      console.info("Skipped update");
      return;
    }

    this.needsUpdate = false;

    const activeView = this.getActiveView();
    const activeBinF = binNumberFunction(
      activeView.extent[0],
      stepSize(activeView.extent, CHART_WIDTH)
    );

    const brush = this.brushes.get(activeView.dimension);

    if (brush) {
      // active brush in pixel domain
      const activeBrush = brush.map(b =>
        clamp(activeBinF(b), [0, CHART_WIDTH - 1])
      );

      for (const view of this.views.filter(v => v.name !== this.activeView)) {
        if (is1DView(view)) {
          const binConfig = bin({ maxbins: view.bins, extent: view.extent });
          const b = binToData(binConfig.start, binConfig.step);
          const data = diff(
            this.getResult(view.name, activeBrush[0]),
            this.getResult(view.name, activeBrush[1])
          ).map((d, i, _) => ({
            key: b(i),
            value: d
          }));

          const changeSet = changeset()
            .remove(() => true)
            .insert(data);
          const vgView = this.vegaViews.get(view.name)!;
          vgView.runAfter(() => {
            vgView.change("table", changeSet).run();
          });
        } else {
          // TODO
        }
      }
    } else {
      // brush cleared
      for (const view of this.views.filter(v => v.name !== this.activeView)) {
        if (is1DView(view)) {
          const binConfig = bin({ maxbins: view.bins, extent: view.extent });
          const b = binToData(binConfig.start, binConfig.step);
          const dimensionEntry = this.data.get(view.name)!;
          const array = Array.prototype.slice.call(
            // get last histogram, which is a complete histogram
            dimensionEntry[dimensionEntry.length - 1]
          );
          const data = array.map((d, i, _) => ({
            key: b(i),
            value: d
          }));

          const changeSet = changeset()
            .remove(() => true)
            .insert(data);
          const vgView = this.vegaViews.get(view.name)!;
          vgView.runAfter(() => {
            vgView.change("table", changeSet).run();
          });
        } else {
          // TODO
        }
      }
    }
  }
}
