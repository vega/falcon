import { BaseType, select, Selection } from "d3";
import { changeset, View as VgView } from "vega-lib";
import { DataBase } from "./db";
import {
  bin,
  binNumberFunction,
  binToData,
  clamp,
  diff,
  is1DView,
  omit,
  stepSize
} from "./util";
import { CHART_WIDTH, createHistogramView } from "./view";

export class App<V extends string, D extends string> {
  private activeView: V;
  private vegaViews = new Map<V, VgView>();
  private brushes = new Map<D, Interval<number>>();
  private data: ResultCube<V>;
  private needsUpdate = false;

  public constructor(
    private readonly el: Selection<BaseType, {}, HTMLElement, any>,
    private readonly views: Views<V, D>,
    order: V[],
    private db: DataBase<V, D>
  ) {
    // this.activeView = views[0].name;
    this.initialize(order);
  }

  private initialize(order: V[]) {
    const self = this;
    this.el
      .selectAll(".view")
      .data(order)
      .enter()
      .append("div")
      .attr("class", "view")
      .each(function(name: V) {
        const view = self.views.get(name)!;

        if (is1DView(view)) {
          const binConfig = bin({ maxbins: view.bins, extent: view.extent });
          view.binConfig = binConfig;
          const vegaView = createHistogramView(
            select(this).node() as Element,
            view.dimension,
            binConfig
          );

          const data = self.db.histogram(view.dimension, binConfig);

          vegaView.insert("table", data).run();

          // attach listener for brush changes
          vegaView.addSignalListener("range", (_name, value) => {
            self.brushMove(name, view.dimension, value);
          });

          self.vegaViews.set(name, vegaView);
        } else {
          view.binConfigs = [
            bin({
              maxbins: view.bins[0],
              extent: view.extents[0]
            }),
            bin({
              maxbins: view.bins[1],
              extent: view.extents[1]
            })
          ];

          // TODO
        }
      });
  }

  private switchActiveView(name: V) {
    console.log(`Active view ${this.activeView} => ${name}`);
    this.activeView = name;

    const activeView = this.getActiveView();

    const brushes = new Map(this.brushes);
    if (is1DView(activeView)) {
      brushes.delete(activeView.dimension);
    }

    this.data = this.db.loadData(
      activeView,
      CHART_WIDTH,
      omit(this.views, name),
      brushes
    );
  }

  private brushMove(name: V, dimension: D, value: [number, number]) {
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

  private getActiveView() {
    return this.views.get(this.activeView)! as View1D<D>;
  }

  private getResult(name: V, index: number) {
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

      for (const [name, view] of this.views) {
        if (name === this.activeView) {
          continue;
        }

        if (is1DView(view)) {
          const b = binToData(view.binConfig!.start, view.binConfig!.step);
          const data = diff(
            this.getResult(name, activeBrush[0]),
            this.getResult(name, activeBrush[1])
          ).map((d, i, _) => ({
            key: b(i),
            value: d
          }));

          const changeSet = changeset()
            .remove(() => true)
            .insert(data);
          const vgView = this.vegaViews.get(name)!;
          vgView.runAfter(() => {
            vgView.change("table", changeSet).run();
          });
        } else {
          // TODO
        }
      }
    } else {
      // brush cleared
      for (const [name, view] of this.views) {
        if (name === this.activeView) {
          continue;
        }
        if (is1DView(view)) {
          const b = binToData(view.binConfig!.start, view.binConfig!.step);
          const dimensionEntry = this.data.get(name)!;
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
          const vgView = this.vegaViews.get(name)!;
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
