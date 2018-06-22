import { BaseType, select, Selection, extent, range } from "d3";
import { changeset, View as VgView, truthy } from "vega-lib";
import { DataBase } from "./db";
import {
  bin,
  binNumberFunction,
  binToData,
  clamp,
  diff,
  is1DView,
  omit,
  stepSize,
  numBins
} from "./util";
import {
  HISTOGRAM_WIDTH,
  createHistogramView,
  createHeatmapView
} from "./view";
import { Logger } from "./logger";

export class App<V extends string, D extends string> {
  private activeView: V;
  private vegaViews = new Map<V, VgView>();
  private brushes = new Map<D, Interval<number>>();
  private data: ResultCube<V>;
  private needsUpdate = false;

  /**
   * Construct the app
   * @param el The element.
   * @param views The views.
   * @param order The order of views.
   * @param db The database to query.
   * @param logger An optional logger to collect traces.
   */
  public constructor(
    private readonly el: Selection<BaseType, {}, HTMLElement, any>,
    private readonly views: Views<V, D>,
    order: V[],
    private db: DataBase<V, D>,
    private logger?: Logger
  ) {
    // this.activeView = views[0].name;
    this.initialize(order);
  }

  private initialize(order: V[]) {
    const self = this;
    this.el
      .attr("class", "app")
      .selectAll(".view")
      .data(order)
      .enter()
      .append("div")
      .attr("class", "view")
      .each(function(name: V) {
        const view = self.views.get(name)!;
        const el = select(this).node() as Element;
        if (is1DView(view)) {
          const binConfig = bin({
            maxbins: view.dimension.bins,
            extent: view.dimension.extent
          });
          view.dimension.binConfig = binConfig;

          const vegaView = createHistogramView(el, view);

          const data = self.db.histogram(view.dimension);

          vegaView.insert("table", data).run();

          // attach listener for brush changes
          vegaView.addSignalListener("brush", (_name, value) => {
            self.brushMove(name, view.dimension.name, value);
          });

          if (self.logger) {
            self.logger.attach(vegaView);
          }

          vegaView.addEventListener("mouseover", () => {
            if (self.activeView !== name) {
              self.switchActiveView(name);
            }
          });

          self.vegaViews.set(name, vegaView);
        } else {
          for (const dimension of view.dimensions) {
            const binConfig = bin({
              maxbins: dimension.bins,
              extent: dimension.extent
            });
            dimension.binConfig = binConfig;
          }

          const vegaView = createHeatmapView(el, view);

          const data = self.db.heatmap(view.dimensions);

          vegaView.insert("table", data).run();

          self.vegaViews.set(name, vegaView);
        }
      });
  }

  private switchActiveView(name: V) {
    console.log(`Active view ${this.activeView} => ${name}`);

    if (this.activeView) {
      this.vegaViews.get(this.activeView)!.runAfter(view => {
        view.signal("active", false).run();
      });
    }

    this.activeView = name;

    const activeView = this.getActiveView();

    const brushes = new Map(this.brushes);
    if (is1DView(activeView)) {
      brushes.delete(activeView.dimension.name);
    }

    this.data = this.db.loadData(
      activeView,
      HISTOGRAM_WIDTH,
      omit(this.views, name),
      brushes
    );

    const activeVgView = this.vegaViews.get(name)!;
    activeVgView.runAfter(view => {
      view.signal("active", true).run();
    });

    // activeVgView.change(
    //   "interesting",
    //   changeset()
    //     .remove(truthy)
    //     .insert(this.calculateInterestingness())
    // );
  }

  private calculateInterestingness() {
    let out: {
      view: V;
      x: number;
      value: any;
    }[] = [];

    for (const [name, view] of omit(this.views, this.activeView)) {
      if (is1DView(view)) {
        const data = range(HISTOGRAM_WIDTH - 1).map(pixel => {
          const distance = diff(
            this.getResult(name, pixel),
            this.getResult(name, pixel + 1)
          ).reduce((acc, val) => acc + Math.abs(val), 0);
          return {
            view: name,
            x: pixel,
            value: distance
          };
        });
        out = out.concat(data);
      } else {
        // TODO
      }
    }

    return out;
  }

  private brushMove(name: V, dimension: D, value: [number, number]) {
    if (this.activeView !== name) {
      this.switchActiveView(name);
    }

    // delete or set brush
    if (!value) {
      this.brushes.delete(dimension);
    } else {
      this.brushes.set(dimension, extent(value) as [number, number]);
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
    console.warn(`Could not find any data ${name} at ${index}.`);

    const view = this.views.get(name)!;
    if (is1DView(view)) {
      const binConfig = view.dimension.binConfig!;
      return new Uint32Array(numBins(binConfig));
    } else {
      // TODO
      throw new Error("Not supported");
    }
  }

  private update() {
    if (!this.needsUpdate) {
      console.info("Skipped update");
      return;
    }

    this.needsUpdate = false;

    const activeView = this.getActiveView();
    const activeBinF = binNumberFunction({
      start: activeView.dimension.extent[0],
      step: stepSize(activeView.dimension.extent, HISTOGRAM_WIDTH)
    });

    const brush = this.brushes.get(activeView.dimension.name);

    if (brush) {
      // active brush in pixel domain
      const activeBrush = brush.map(b =>
        clamp(activeBinF(b), [0, HISTOGRAM_WIDTH - 1])
      );

      for (const [name, view] of this.views) {
        if (name === this.activeView) {
          continue;
        }

        let data; // the data for Vega

        if (is1DView(view)) {
          const dim = view.dimension;
          const b = binToData(dim.binConfig!);
          data = diff(
            this.getResult(name, activeBrush[0]),
            this.getResult(name, activeBrush[1])
          ).map((d, i, _) => ({
            key: b(i),
            value: d
          }));
        } else {
          const binConfigs = view.dimensions.map(d => d.binConfig!);
          const [numBinsX, numBinsY] = binConfigs.map(numBins);
          const [binToDataX, binToDataY] = binConfigs.map(binToData);
          data = diff(
            this.getResult(name, activeBrush[0]),
            this.getResult(name, activeBrush[1])
          ).map((value, i, _) => ({
            keyX: binToDataX(i % numBinsX),
            keyY: binToDataY(Math.floor(i / numBinsY)),
            value
          }));
        }

        const changeSet = changeset()
          .remove(truthy)
          .insert(data);
        const vgView = this.vegaViews.get(name)!;
        vgView.runAfter(() => {
          vgView.change("table", changeSet).run();
        });
      }
    } else {
      // brush cleared
      for (const [name, view] of this.views) {
        if (name === this.activeView) {
          continue;
        }

        let data;

        const dimensionEntry = this.data.get(name)!;
        const array = Array.from(
          // get last histogram, which is a complete histogram
          dimensionEntry[dimensionEntry.length - 1]
        );

        if (is1DView(view)) {
          const dim = view.dimension;
          const b = binToData(dim.binConfig!);
          data = array.map((d, i, _) => ({
            key: b(i),
            value: d
          }));
        } else {
          const binConfigs = view.dimensions.map(d => d.binConfig!);
          const [numBinsX, numBinsY] = binConfigs.map(numBins);
          const [binToDataX, binToDataY] = binConfigs.map(binToData);

          data = array.map((value, i, _) => ({
            keyX: binToDataX(i % numBinsX),
            keyY: binToDataY(Math.floor(i / numBinsY)),
            value
          }));
        }
        const changeSet = changeset()
          .remove(truthy)
          .insert(data);
        this.vegaViews.get(name)!.runAfter(vgView => {
          vgView.change("table", changeSet).run();
        });
      }
    }
  }
}
