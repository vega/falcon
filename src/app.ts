import { extent } from "d3";
import ndarray from "ndarray";
import { changeset, truthy, View as VgView } from "vega-lib";
import { Logger, View, View1D, View2D, Views } from "./api";
import { Interval } from "./basic";
import { Config, DEFAULT_CONFIG } from "./config";
import { DataBase } from "./db";
import { Cubes } from "./db/db";
import {
  bin,
  binNumberFunction,
  binTime,
  binToData,
  chEmd,
  omit,
  stepSize,
  sub,
  summedAreaTableLookup
} from "./util";
import {
  createBarView,
  createHeatmapView,
  createHistogramView,
  createTextView,
  HEATMAP_WIDTH,
  HISTOGRAM_WIDTH
} from "./views";

let mouseIsDown = false;

document.onmousedown = () => {
  mouseIsDown = true;
};

document.onmouseup = () => {
  mouseIsDown = false;
};

interface Data<V> {
  pixels: number | Interval<number>;
  cubes: Cubes<V>;
}

interface PendingData<V> {
  pixels: number | Interval<number>;
  cubes: Cubes<V> | Promise<Cubes<V>>;
}

export class App<V extends string, D extends string> {
  private readonly views: Views<V, D> = new Map();
  private activeView: V;
  private vegaViews = new Map<V, VgView>();
  private brushes = new Map<D, Interval<number>>();

  /**
   * Data for each non-active view.
   */
  private data: Data<V>;

  /**
   * Preferched data that can be moved to data when the active view changes.
   */
  private prefetchedData = new Map<V, PendingData<V>>();

  /**
   * How many requests are pending for the view;
   */
  private pendingRequests = new Map<V, number>();

  private readonly config: Config;

  private logger?: Logger<V>;

  /**
   * Construct the app
   * @param views The views.
   * @param db The database to query.
   * @param opt Optional arguments.
   */
  public constructor(
    views: Views<V, D>,
    private db: DataBase<V, D>,
    opt?: {
      config?: Partial<Config>;
      logger?: Logger<V>;
      cb?: () => void;
    }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...((opt && opt.config) || {}) };
    this.logger = opt && opt.logger;

    for (const [name, view] of views) {
      if (view.el) {
        this.views.set(name, view);
      }
    }

    this.initialize()
      .then(() => {
        console.info("Initialization finished.");
        opt && opt.cb && opt.cb();
      })
      .catch(console.error);
  }

  private async initialize() {
    // initialize the database
    await this.db.initialize();

    await Promise.all(
      Array.from(this.views.entries()).map(([name, view]) =>
        this.initializeView(name, view)
      )
    );
  }

  /**
   * Get a hash of the current state to see whether requests are still valid in the future.
   */
  private stateHash() {
    const activeView = this.getActiveView();
    const brushes =
      activeView.type === "1D"
        ? omit(this.brushes, activeView.dimension.name)
        : omit(this.brushes, ...activeView.dimensions.map(d => d.name));
    let brushStrings: string[] = [];
    for (const [k, v] of brushes) {
      brushStrings.push(`${k}:${v}`);
    }
    return `${this.activeView} ${brushStrings.sort().join(" ")}`;
  }

  private async initializeView(name: V, view: View<D>) {
    const el = view.el!;
    if (view.type === "0D") {
      const vegaView = (this.config.zeroDBar ? createBarView : createTextView)(
        el,
        view
      );
      this.vegaViews.set(name, vegaView);

      this.update0DView(name, await this.db.length(), true);
    } else if (view.type === "1D") {
      const binConfig = (view.dimension.time ? binTime : bin)(
        view.dimension.bins,
        view.dimension.extent
      );
      view.dimension.binConfig = binConfig;

      const vegaView = createHistogramView(
        el,
        view,
        this.config,
        !!this.logger
      );
      this.vegaViews.set(name, vegaView);

      const data = await this.db.histogram(view.dimension);
      this.update1DView(name, view, data, this.config.showBase);

      vegaView.addSignalListener("brush", (_name, value) => {
        this.brushMove1D(name, view.dimension.name, value);
      });

      vegaView.addEventListener("mouseover", () => {
        this.prefetchActiveView(name);
      });

      if (this.config.showInterestingness) {
        vegaView.addSignalListener(
          "brushSingleStart",
          (_name, value: number) => {
            vegaView
              .signal("pixels", this.data.pixels)
              .change(
                "interesting",
                changeset()
                  .remove(truthy)
                  .insert(this.calculateInterestingness({ start: value }))
              )
              .run();
          }
        );

        vegaView.addSignalListener("brushMoveStart", (_name, value: number) => {
          vegaView
            .signal("pixels", this.data.pixels)
            .change(
              "interesting",
              changeset()
                .remove(truthy)
                .insert(this.calculateInterestingness({ window: value }))
            )
            .run();
        });
      }

      if (this.logger) {
        this.logger.attach(name, vegaView);
      }
    } else {
      for (const dimension of view.dimensions) {
        const binConfig = (dimension.time ? binTime : bin)(
          dimension.bins,
          dimension.extent
        );
        dimension.binConfig = binConfig;
      }

      const vegaView = createHeatmapView(el, view, this.config);
      this.vegaViews.set(name, vegaView);

      const data = await this.db.heatmap(view.dimensions);
      this.update2DView(name, view, data);

      vegaView.addSignalListener("brush", (_name, value) => {
        this.brushMove2D(
          name,
          view.dimensions[0].name,
          view.dimensions[1].name,
          value
        );
      });

      vegaView.addEventListener("mouseover", () => {
        this.prefetchActiveView(name);
      });
    }
  }

  /**
   * Get data for the view so that we can brush in it.
   */
  private prefetchActiveView(name: V) {
    if (
      this.activeView === name ||
      mouseIsDown ||
      this.prefetchedData.has(name)
    )
      return;

    const view = this.views.get(name)!;

    let cubes: Promise<Cubes<V>> | Cubes<V>;
    let pixels: number | Interval<number>;

    if (view.type === "1D") {
      pixels = 10;
      cubes = this.load1DData(name, view, pixels);
    } else if (view.type === "2D") {
      pixels = [10, 10];
      cubes = this.load2DData(name, view, pixels);
    } else {
      throw new Error("0D cannot be an active view.");
    }

    const vgView = this.vegaViews.get(name)!;
    vgView.container()!.style.cursor = "wait";

    // mark view as pending as long as we don't have required data
    const done = () => {
      console.log("view ready", name);
      vgView.container()!.style.cursor = null;
      vgView.signal("ready", true).run();
    };

    if (cubes instanceof Promise) {
      this.pendingRequests.set(name, this.pendingRequests.get(name) || 0 + 1);
      cubes.then(() => {
        const count = this.pendingRequests.get(name)! - 1;
        this.pendingRequests.set(name, count);
        if (count === 0) {
          done();
        }
      });
    } else {
      done();
    }

    this.prefetchedData.set(name, { pixels, cubes });
  }

  private load1DData(name: V, view: View1D<D>, pixels: number) {
    return this.db.loadData1D(
      view,
      pixels,
      omit(this.views, name),
      omit(this.brushes, view.dimension.name)
    );
  }

  private load2DData(name: V, view: View2D<D>, pixels: Interval<number>) {
    return this.db.loadData2D(
      view,
      pixels,
      omit(this.views, name),
      omit(this.brushes, ...view.dimensions.map(d => d.name))
    );
  }

  /**
   * Switch which view is active.
   */
  private async switchActiveView(name: V) {
    console.info(`Active view ${this.activeView} => ${name}`);

    for (const [n, v] of this.vegaViews) {
      if (n !== name) {
        v.runAfter(view => {
          view
            .remove("interesting", truthy)
            .resize()
            .signal("ready", false)
            .run();
        });
      }
    }

    this.activeView = name;

    const activeView = this.getActiveView();
    const activeVgView = this.vegaViews.get(name)!;

    const data = this.prefetchedData.get(name)!;
    this.data = {
      pixels: data.pixels,
      // data cubes should be ready since we only allow interactions with views that are ready
      cubes: await data.cubes
    };

    // need to clear because the brushes are changing now
    this.prefetchedData.clear();

    if (activeView.type === "1D" && this.config.showInterestingness) {
      // show basic interestingness
      activeVgView
        .signal("pixels", this.data.pixels)
        .change(
          "interesting",
          changeset()
            .remove(truthy)
            .insert(this.calculateInterestingness())
        )
        .resize()
        .run();
    }

    const hash = this.stateHash();

    const loadHighResData = async () => {
      console.info("Loading high resolution data...");
      if (activeView.type === "1D") {
        const pixels = HISTOGRAM_WIDTH;
        return {
          pixels,
          cubes: await this.load1DData(name, activeView, pixels)
        };
      } else {
        const pixels: Interval<number> = [HEATMAP_WIDTH, HEATMAP_WIDTH];
        return {
          pixels,
          cubes: await this.load2DData(name, activeView, pixels)
        };
      }
    };

    if (this.db.blocking) {
      window.setTimeout(async () => {
        if (hash === this.stateHash()) {
          this.data = await loadHighResData();
          this.update();
        }
      }, 1000);
    } else {
      // put request for high resolution data in the background
      loadHighResData().then(data => {
        if (hash === this.stateHash()) {
          this.data = data;
          this.update();
        } else {
          console.info("Received outdated result that was ignored.");
        }
      });
    }
  }

  /**
   * Compute an interestingness metric.
   */
  private calculateInterestingness(
    opt: { start?: number; window?: number } = {}
  ) {
    let out: {
      view: V;
      x: number;
      value: any;
    }[] = [];

    console.time("Compute interestingness");

    const { cubes, pixels: pixels_ } = this.data;
    const pixels = pixels_ as number;

    for (const [name, view] of omit(this.views, this.activeView)) {
      if (view.type !== "0D") {
        let data: Array<any>;

        const { hists } = cubes.get(name)!;

        if (opt.window !== undefined) {
          const w = Math.floor(opt.window / 2);

          data = new Array(pixels - opt.window);

          for (let pixel = w; pixel < pixels - w; pixel++) {
            const distance = chEmd(
              hists.pick(pixel - w, null, null),
              hists.pick(pixel + w, null, null)
            );

            data[pixel - w] = {
              view: name,
              x: pixel,
              value: Math.log(distance + 1e-6)
            };
          }
        } else {
          data = new Array(pixels);

          // cache the start cumulative histogram
          let startChf: ndarray = ndarray([]);
          if (opt.start !== undefined) {
            startChf = hists.pick(opt.start, null, null);
          }

          for (let pixel = 0; pixel < pixels; pixel++) {
            let distance: number;

            if (opt.start !== undefined) {
              distance = chEmd(startChf, hists.pick(pixel, null, null));
            } else {
              distance = chEmd(
                hists.pick(pixel, null, null),
                hists.pick(pixel + 1, null, null)
              );
            }

            data[pixel] = {
              view: name,
              x: pixel,
              value: Math.log(distance + 1e-6)
            };
          }
        }

        out = out.concat(data);
      }
    }
    console.timeEnd("Compute interestingness");

    return out;
  }

  private async brushMove1D(name: V, dimension: D, value: [number, number]) {
    if (this.activeView !== name) {
      await this.switchActiveView(name);
    }

    // delete or set brush
    if (!value) {
      this.brushes.delete(dimension);
    } else {
      this.brushes.set(dimension, extent(value) as [number, number]);
    }

    this.update();
  }

  private async brushMove2D(
    name: V,
    dim1: D,
    dim2: D,
    value: Interval<[number, number]>
  ) {
    if (this.activeView !== name) {
      await this.switchActiveView(name);
    }

    // delete or set brush
    if (!value) {
      this.brushes.delete(dim1);
      this.brushes.delete(dim2);
    } else {
      this.brushes.set(dim1, extent(value[0]) as [number, number]);
      this.brushes.set(dim2, extent(value[1]) as [number, number]);
    }

    this.update();
  }

  private getActiveView() {
    return this.views.get(this.activeView)! as View1D<D> | View2D<D>;
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

    const { cubes, pixels } = this.data;

    if (activeView.type === "1D") {
      const activeBinF = binNumberFunction({
        start: activeView.dimension.extent[0],
        step: stepSize(activeView.dimension.extent, pixels as number)
      });

      const brush = this.brushes.get(activeView.dimension.name);

      let activeBrush: number[] | null = null;

      if (brush) {
        // active brush in pixel domain
        activeBrush = brush.map(activeBinF);
      }

      for (const [name, view] of this.views) {
        if (name === this.activeView) {
          continue;
        }

        const data = cubes.get(name)!;
        const hists = data.hists;

        if (view.type === "0D") {
          const value = activeBrush
            ? hists.get(activeBrush[1]) - hists.get(activeBrush[0])
            : data.noBrush.data[0];

          this.update0DView(name, value, false);
        } else if (view.type === "1D") {
          const hist = activeBrush
            ? sub(
                hists.pick(activeBrush[0], null),
                hists.pick(activeBrush[1], null)
              )
            : data.noBrush;

          this.update1DView(name, view, hist, false);
        } else {
          const heat = activeBrush
            ? sub(
                hists.pick(activeBrush[0], null, null),
                hists.pick(activeBrush[1], null, null)
              )
            : data.noBrush;

          this.update2DView(name, view, heat);
        }
      }
    } else {
      const activeBinF = [0, 1].map(i =>
        binNumberFunction({
          start: activeView.dimensions[i].extent[0],
          step: stepSize(
            activeView.dimensions[i].extent,
            (pixels as Interval<number>)[i]
          )
        })
      );

      const brush = [0, 1].map(i =>
        this.brushes.get(activeView.dimensions[i].name)
      );

      let activeBrush: Interval<number[]> | null = null;

      if (brush[0] && brush[1]) {
        // active brush in pixel domain
        activeBrush = [
          brush[0]!.map(activeBinF[0]),
          brush[1]!.map(activeBinF[1])
        ];
      }

      for (const [name, view] of this.views) {
        if (name === this.activeView) {
          continue;
        }
        const data = cubes.get(name)!;
        const hists = data.hists;

        if (view.type === "0D") {
          const value = activeBrush
            ? hists.get(activeBrush[0][1], activeBrush[1][1]) -
              hists.get(activeBrush[0][1], activeBrush[1][0]) -
              hists.get(activeBrush[0][0], activeBrush[1][1]) +
              hists.get(activeBrush[0][0], activeBrush[1][0])
            : data.noBrush[0];

          this.update0DView(name, value, false);
        } else if (view.type === "1D") {
          const hist = activeBrush
            ? summedAreaTableLookup(
                hists.pick(activeBrush[0][1], activeBrush[1][1], null),
                hists.pick(activeBrush[0][1], activeBrush[1][0], null),
                hists.pick(activeBrush[0][0], activeBrush[1][1], null),
                hists.pick(activeBrush[0][0], activeBrush[1][0], null)
              )
            : data.noBrush;

          this.update1DView(name, view, hist, false);
        } else {
          // not yet implemented
          console.warn("not yet implemented");
        }
      }
    }
  }
}
