import { Logger } from "./api";
import { extent } from "d3";
import ndarray from "ndarray";
import { changeset, truthy, View as VgView } from "vega-lib";
import { View1D, View2D, Views } from "./api";
import { Interval } from "./basic.d";
import { Config, DEFAULT_CONFIG } from "./config";
import { DataBase } from "./db";
import {
  bin,
  binNumberFunction,
  binToData,
  clamp,
  diff,
  omit,
  stepSize
} from "./util";
import {
  createBarView,
  createHeatmapView,
  createHistogramView,
  createTextView,
  HISTOGRAM_WIDTH
} from "./views";

export class App<V extends string, D extends string> {
  private readonly views: Views<V, D> = new Map();
  private activeView: V;
  private vegaViews = new Map<V, VgView>();
  private brushes = new Map<D, Interval<number>>();
  private data: Map<V, ndarray>;
  private readonly config: Config;

  /**
   * Construct the app
   * @param views The views.
   * @param db The database to query.
   * @param logger An optional logger to collect traces.
   */
  public constructor(
    views: Views<V, D>,
    private db: DataBase<V, D>,
    config?: Partial<Config>,
    private logger?: Logger<V>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...(config || {}) };

    for (const [name, view] of views) {
      if (view.el) {
        this.views.set(name, view);
      }
    }

    this.initialize();
  }

  private initialize() {
    for (const [name, view] of this.views) {
      const el = view.el!;
      if (view.type === "0D") {
        const vegaView = (this.config.zeroDBar
          ? createBarView
          : createTextView)(el, view);
        this.vegaViews.set(name, vegaView);

        this.update0DView(name, this.db.length, true);
      } else if (view.type === "1D") {
        const binConfig = bin({
          maxbins: view.dimension.bins,
          extent: view.dimension.extent
        });
        view.dimension.binConfig = binConfig;

        const vegaView = createHistogramView(
          el,
          view,
          this.config,
          !!this.logger
        );
        this.vegaViews.set(name, vegaView);

        const data = this.db.histogram(view.dimension);
        this.update1DView(name, view, data, this.config.showBase);

        vegaView.addSignalListener("brush", (_name, value) => {
          this.brushMove(name, view.dimension.name, value);
        });

        vegaView.addEventListener("mouseover", () => {
          if (this.activeView !== name) {
            this.switchActiveView(name);
          }
        });

        if (this.logger) {
          this.logger.attach(name, vegaView);
        }
      } else {
        for (const dimension of view.dimensions) {
          const binConfig = bin({
            maxbins: dimension.bins,
            extent: dimension.extent
          });
          dimension.binConfig = binConfig;
        }

        const vegaView = createHeatmapView(el, view);
        this.vegaViews.set(name, vegaView);

        const data = this.db.heatmap(view.dimensions);
        this.update2DView(name, view, data);
      }
    }
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
    if (activeView.type == "1D") {
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

  // private calculateInterestingness() {
  //   let out: {
  //     view: V;
  //     x: number;
  //     value: any;
  //   }[] = [];

  //   for (const [name, view] of omit(this.views, this.activeView)) {
  //     if (view.type === '1D') {
  //       const data = range(HISTOGRAM_WIDTH - 1).map(pixel => {
  //         const distance = diff(
  //           this.getResult(name, pixel),
  //           this.getResult(name, pixel + 1)
  //         ).reduce((acc, val) => acc + Math.abs(val), 0);
  //         return {
  //           view: name,
  //           x: pixel,
  //           value: distance
  //         };
  //       });
  //       out = out.concat(data);
  //     } else {
  //       // TODO
  //     }
  //   }

  //   return out;
  // }

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

    this.update();
  }

  private getActiveView() {
    return this.views.get(this.activeView)! as View1D<D>;
  }

  private update0DView(name: V, value: number, base: boolean) {
    this.updateView(
      name,
      [
        {
          value: value
        }
      ],
      base
    );
  }

  private update1DView(name: V, view: View1D<D>, hist: ndarray, base: boolean) {
    const unbin = binToData(view.dimension.binConfig!);

    const data = new Array(hist.size);

    for (let x = 0; x < hist.shape[0]; x++) {
      data[x] = {
        key: unbin(x),
        value: hist.get(x)
      };
    }

    this.updateView(name, data, base);
  }

  private update2DView(name: V, view: View2D<D>, heat: ndarray) {
    const binConfigs = view.dimensions.map(d => d.binConfig!);
    const [binToDataX, binToDataY] = binConfigs.map(binToData);

    const data = new Array(heat.size);

    let i = 0;
    for (let x = 0; x < heat.shape[0]; x++) {
      for (let y = 0; y < heat.shape[1]; y++) {
        data[i++] = {
          keyX: binToDataX(x),
          keyY: binToDataY(y),
          value: heat.get(x, y)
        };
      }
    }

    this.updateView(name, data);
  }

  private updateView<T>(name: V, data: T[], base: boolean = false) {
    const changeSet = changeset()
      .remove(truthy)
      .insert(data);

    const vgView = this.vegaViews.get(name)!;
    vgView.runAfter(() => {
      vgView.change("table", changeSet);
      if (base) {
        vgView.change("base", changeSet);
      }
      vgView.run();
    });
  }

  private update() {
    const activeView = this.getActiveView();
    const activeBinF = binNumberFunction({
      start: activeView.dimension.extent[0],
      step: stepSize(activeView.dimension.extent, HISTOGRAM_WIDTH)
    });

    const brush = this.brushes.get(activeView.dimension.name);

    let activeBrush: number[] | null = null;

    if (brush) {
      // active brush in pixel domain
      activeBrush = brush.map(b => clamp(activeBinF(b), [0, HISTOGRAM_WIDTH]));
    }

    for (const [name, view] of this.views) {
      if (name === this.activeView) {
        continue;
      }

      const hists = this.data.get(name)!;

      if (view.type === "0D") {
        const value = activeBrush
          ? hists.get(activeBrush[1]) - hists.get(activeBrush[0])
          : hists.get(HISTOGRAM_WIDTH) + 1;
        this.update0DView(name, value, false);
      } else if (view.type === "1D") {
        const hist = activeBrush
          ? diff(
              hists.pick(activeBrush[0], null),
              hists.pick(activeBrush[1], null)
            )
          : hists.pick(HISTOGRAM_WIDTH + 1, null);

        this.update1DView(name, view, hist, false);
      } else {
        const heat = activeBrush
          ? diff(
              hists.pick(activeBrush[0], null, null),
              hists.pick(activeBrush[1], null, null)
            )
          : hists.pick(HISTOGRAM_WIDTH + 1, null, null);

        this.update2DView(name, view, heat);
      }
    }
  }
}
