import ndarray from "ndarray";
import interpolate from "ndarray-linear-interpolate";
import { changeset, truthy, View as VgView } from "vega-lib";
import { BinConfig, Logger, View, View1D, View2D, Views } from "./api";
import { Interval } from "./basic";
import { Config, DEFAULT_CONFIG } from "./config";
import { Cubes, DataBase } from "./db";
import {
  bin,
  binTime,
  binToData,
  chEmd,
  debounce,
  equal,
  extent,
  numBins,
  omit,
  sub,
  subInterpolated,
  summedAreaTableLookup,
  summedAreaTableLookupInterpolateSlow,
  summedAreaTableLookupInterpolateSlow2D,
  throttle
} from "./util";
import {
  createHeatmapView,
  createHistogramView,
  createHorizontalBarView,
  createTextView,
  createVerticalBarView
} from "./views";
// import imshow from "ndarray-imshow";

const interp2d = interpolate.d2;

let mouseIsDown = false;

const dcb = () => {
  mouseIsDown = true;
};
document.onmousedown = dcb;
document.ontouchstart = dcb;

const ucb = () => {
  mouseIsDown = false;
};
document.onmouseup = ucb;
document.ontouchend = ucb;

class PendingData<V> {
  private highRes: Cubes<V> | Promise<Cubes<V>>;

  private highResPending = true;

  constructor(
    private lowRes: Cubes<V> | Promise<Cubes<V>>,
    /**
     * Function to request high res data. Can be resolved later.
     */
    private fetchHighRes_: () => Cubes<V> | Promise<Cubes<V>>,
    private highResCallback: (cubes: Cubes<V>) => void
  ) {}

  public fetchHighRes() {
    if (!this.highRes) {
      this.highRes = this.fetchHighRes_();

      const done = cube => {
        this.highResPending = false;
        this.highResCallback(cube);
      };

      if (this.highRes instanceof Promise) {
        this.highRes.then(done);
      } else {
        done(this.highRes);
      }
    }
  }

  public cubes(): Cubes<V> | Promise<Cubes<V>> {
    return this.highResPending ? this.lowRes : this.highRes;
  }

  public hasHighRes() {
    return !this.highResPending;
  }
}

export class App<V extends string, D extends string> {
  private readonly views: Views<V, D> = new Map();
  private activeView: V;
  private vegaViews = new Map<V, VgView>();
  private brushes = new Map<D, Interval<number>>();

  /**
   * Prefetched data that can be moved to data when the active view changes.
   */
  private prefetchedData = new Map<V, PendingData<V>>();

  /**
   * How many required requests are pending for the view;
   */
  private pendingRequests = new Map<V, number>();

  private readonly config: Config;

  private logger?: Logger<V>;

  private readonly highRes1D: number;
  private readonly highRes2D: number;

  private throttledUpdate: () => void;

  /**
   * Track which view was last hovered so we can fetch high resolution data.
   */
  private lastHovered: {
    view: V | null;
    when: number;
  } = { view: null, when: 0 };

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
      cb?: (app: App<V, D>) => void;
    }
  ) {
    this.config = { ...DEFAULT_CONFIG, ...((opt && opt.config) || {}) };
    this.logger = opt && opt.logger;

    if (this.config.interpolate && !this.config.progressiveInteractions) {
      console.warn(
        "If you use interpolation, you probably also want to enable progressive interactions."
      );
    }

    this.highRes1D = Math.min(
      this.config.maxInteractiveResolution1D,
      this.config.histogramWidth
    );
    this.highRes2D = Math.min(
      this.config.maxInteractiveResolution2D,
      this.config.heatmapWidth
    );

    this.throttledUpdate = throttle(this.update);

    for (const [name, view] of views) {
      if (view.el) {
        this.views.set(name, view);
      }
    }

    this.initialize()
      .then(() => {
        console.info("Initialization finished.");
        opt && opt.cb && opt.cb(this);
      })
      .catch(console.error);
  }

  public getVegaView(name: V) {
    return this.vegaViews.get(name)!;
  }

  private async initialize() {
    // initialize the database
    await this.db.initialize();

    await Promise.all(
      Array.from(this.views.entries()).map(([name, view]) =>
        this.initializeView(name, view)
      )
    );

    const debouncedPreload = debounce(() => {
      if (mouseIsDown) {
        return;
      }

      console.info("App is idle. Prefetching all views.");

      for (const [name, view] of this.views) {
        if (view.type !== "0D") {
          this.prefetchView(name, false);
        }
      }
    }, this.config.idleTime);

    // prefetch when the app is idle
    const cb = () => {
      debouncedPreload();
    };
    document.onmousemove = cb;
    document.ontouchstart = cb;
    document.ontouchmove = cb;
    document.ontouchend = cb;
    debouncedPreload();
  }

  private async initializeView(name: V, view: View<D>) {
    const el = view.el!;
    let vegaView: VgView;

    if (view.type === "0D") {
      vegaView = (this.config.zeroD === "text"
        ? createTextView
        : this.config.zeroD === "hbar"
          ? createHorizontalBarView
          : createVerticalBarView)(el, view, this.config);
      this.vegaViews.set(name, vegaView);

      this.update0DView(name, await this.db.length(), true);
      this.update0DView(name, await this.db.length());
    } else if (view.type === "1D") {
      const binConfig = (view.dimension.time ? binTime : bin)(
        view.dimension.bins,
        view.dimension.extent
      );
      view.dimension.binConfig = binConfig;

      vegaView = createHistogramView(el, view, this.config, !!this.logger);
      this.vegaViews.set(name, vegaView);

      const { hist } = await this.db.histogram(view.dimension);

      if (this.config.showBase) {
        this.update1DView(name, view, hist, true);
      }
      this.update1DView(name, view, hist);

      vegaView.addSignalListener("brush", (_name, value) => {
        const brush = this.brushes.get(view.dimension.name);
        if (!brush || !equal(value, brush)) {
          this.brushMove1D(name, view.dimension.name, value);
        }
      });

      if (this.config.zoom) {
        const updateHistDebounced = debounce(
          this.updateHistogram.bind(this),
          500
        );

        vegaView.addSignalListener("domain", async (__dirname, value) => {
          // if you zoom, we activate the view
          if (this.activeView !== name) {
            await this.switchActiveView(name, false);
          }

          updateHistDebounced(value);
        });
      }

      if (this.config.showInterestingness) {
        vegaView.addSignalListener(
          "brushSingleStart",
          (_name, value: number) => {
            vegaView
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

      vegaView = createHeatmapView(el, view, this.config);
      this.vegaViews.set(name, vegaView);

      const data = await this.db.heatmap(view.dimensions);
      if (this.config.showBase) {
        this.update2DView(name, view, data, true);
      }
      this.update2DView(name, view, data);

      vegaView.addSignalListener("dataBrush", (_name, value) => {
        this.brushMove2D(
          name,
          view.dimensions[0].name,
          view.dimensions[1].name,
          value
        );
      });
    }

    if (view.type !== "0D") {
      const cb = () => {
        this.prefetchView(name, !!this.config.progressiveInteractions);
      };
      el["on" + this.config.prefetchOn] = cb;
      el.ontouchstart = cb;

      if (this.config.prefetchOn === "mousedown") {
        vegaView.container()!.style.cursor = "pointer";
        (vegaView
          .container()!
          .children.item(0) as HTMLElement).style.pointerEvents = "none";
      }
    }

    vegaView.resize().run();
  }

  /**
   * The domain has changed so we need to zoom the chart.
   */
  private updateHistogram(domain: Interval<number>) {
    const view = this.getActiveView() as View1D<D>;
    const vegaView = this.getActiveVegaView();
    const name = this.activeView;

    const newBinConfig = (view.dimension.time ? binTime : bin)(
      view.dimension.bins,
      domain
    );
    const oldBinConfig = view.dimension.binConfig!;

    if (
      oldBinConfig.start !== newBinConfig.start ||
      oldBinConfig.stop !== newBinConfig.stop
    ) {
      console.info(`New bin configuration for ${name}.`);
      view.dimension.binConfig = newBinConfig;

      this.prefetchedData.delete(name);
      this.prefetchView(name, false);

      vegaView.signal("bin", newBinConfig).runAfter(async () => {
        if (this.config.showBase) {
          const { hist, noBrush } = await this.db.histogram(
            view.dimension,
            omit(this.brushes, view.dimension.name)
          );
          this.update1DView(name, view, noBrush, true);
          this.update1DView(name, view, hist);
        } else {
          const { hist } = await this.db.histogram(view.dimension);
          this.update1DView(name, view, hist);
        }
      });
    }
  }

  /**
   * Get data for the view so that we can brush in it.
   */
  public prefetchView(name: V, progressive: boolean) {
    if (mouseIsDown) {
      return;
    }

    if (this.lastHovered.view !== name) {
      this.lastHovered = {
        view: name,
        when: Date.now()
      };
    }

    const fetchAfterTimeout = () => {
      const startTime = Date.now();
      window.setTimeout(() => {
        if (this.lastHovered.view !== name) {
          console.info(
            `We are hovering over ${
              this.lastHovered.view
            } instead of ${name} so we are not going to fetch high resolution data.`
          );
          return;
        }

        if (startTime < this.lastHovered.when) {
          console.info(
            `We haven't hovered long enough over ${name} yet to fetch high resolution data.`
          );
          return;
        }

        const data = this.prefetchedData.get(name);
        if (data) {
          data.fetchHighRes();
        } else {
          console.warn(
            `Tried to get high resolution data after fetching low res data for ${name} but it is not preloaded.`
          );
        }
      }, this.config.progressiveTimeout);
    };

    const data = this.prefetchedData.get(name);
    if (data) {
      // we might have already prefetched but aborted a previous hover with wait
      if (!data.hasHighRes() && progressive) {
        fetchAfterTimeout();
      }
      return;
    }

    const vegaView = this.getVegaView(name);
    vegaView.container()!.style.cursor = "wait";
    (vegaView
      .container()!
      .children.item(0) as HTMLElement).style.pointerEvents = "none";

    const view = this.views.get(name)!;

    let cubes: Promise<Cubes<V>> | Cubes<V>;
    let lowResPixels: number | Interval<number>;

    if (view.type === "1D") {
      const binConfig = view.dimension.binConfig!;

      lowResPixels = progressive
        ? numBins(binConfig)
        : this.highResPixels(binConfig);

      cubes = this.load1DData(name, view, lowResPixels);
    } else if (view.type === "2D") {
      lowResPixels = progressive
        ? [
            numBins(view.dimensions[0].binConfig!),
            numBins(view.dimensions[1].binConfig!)
          ]
        : [this.highRes2D, this.highRes2D];
      cubes = this.load2DData(name, view, lowResPixels);
    } else {
      throw new Error("0D cannot be an active view.");
    }

    let highResPixels: number | Interval<number>;
    const pendingData = new PendingData(
      cubes,
      () => {
        // get high res data
        if (view.type === "1D") {
          highResPixels = this.highResPixels(view.dimension.binConfig!);
          return this.load1DData(name, view, highResPixels);
        } else {
          highResPixels = [this.highRes2D, this.highRes2D];
          return this.load2DData(name, view, highResPixels);
        }
      },
      () => {
        if (this.prefetchedData.get(name) !== pendingData) {
          console.warn(
            `Received outdated high res result for ${name} that was ignored.`
          );
          return;
        }

        console.info(
          `High res data for ${name} available. Pixels: ${highResPixels}`
        );
        this.setPixels(name, highResPixels);

        for (const [n, vgView] of this.vegaViews) {
          if (n !== name) {
            vgView.signal("approximate", false).run();
          }
        }

        if (name === this.activeView) {
          if (this.config.interpolate) {
            this.update();
          }
        }
      }
    );

    this.prefetchedData.set(name, pendingData);

    // mark view as pending as long as we don't have required data
    const done = () => {
      if (this.prefetchedData.get(name) !== pendingData) {
        console.warn(
          `Received outdated prefetch result for ${name} that was ignored.`
        );
        return;
      }

      vegaView.container()!.style.cursor = null;
      (vegaView
        .container()!
        .children.item(0) as HTMLElement).style.pointerEvents = "all";

      this.setPixels(name, lowResPixels);
      vegaView.signal("ready", true).run();

      if (progressive) {
        fetchAfterTimeout();
      }
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
  }

  /**
   * Calculate the high res pixels for a view.
   */
  private highResPixels(binConfig: BinConfig) {
    if (this.config.zoom) {
      const bins = numBins(binConfig);
      return Math.ceil(this.highRes1D / bins) * bins;
    }
    return this.highRes1D;
  }

  private setPixels(name: V, pixels: number | Interval<number>) {
    this.vegaViews
      .get(name)!
      .signal("pixels", pixels)
      .run();
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

  private clearPrefetched() {
    // keep the prefetched data for the active dimension
    const activePrefetched = this.prefetchedData.get(this.activeView);
    this.prefetchedData.clear();
    if (activePrefetched) {
      this.prefetchedData.set(this.activeView, activePrefetched);
    }

    for (const [n, v] of this.vegaViews) {
      if (n !== this.activeView) {
        v.runAfter(view => {
          // When the active view is 2D, we shold remove the interestingness data
          if (
            this.views.get(this.activeView)!.type === "2D" &&
            this.views.get(n)!.type === "1D"
          ) {
            view.remove("interesting", truthy).resize();
          }
          view.signal("ready", false).run();
        });

        if (this.config.prefetchOn === "mousedown") {
          v.container()!.style.cursor = "pointer";
          (v.container()!.children.item(0) as HTMLElement).style.pointerEvents =
            "none";
        }
      }
    }
  }

  /**
   * Switch which view is active.
   */
  private switchActiveView(name: V, approximate = true) {
    console.info(`Active view ${this.activeView} => ${name}`);

    this.activeView = name;

    const data = this.prefetchedData.get(name)!;

    if (
      this.config.progressiveInteractions === true ||
      (this.config.progressiveInteractions === "only2D" &&
        this.getActiveView().type === "2D")
    ) {
      if (approximate && !data.hasHighRes()) {
        if (this.config.interpolate) {
          for (const [n, vgView] of this.vegaViews) {
            if (n !== name) {
              vgView.signal("approximate", true).run();
            }
          }
        }
      }

      if (!this.db.blocking) {
        // we are not using a blocking db and now this dimension is active so let's get high resolution data now
        this.prefetchedData.get(name)!.fetchHighRes();
      }
    }

    this.showInterestingness();
  }

  private showInterestingness() {
    if (!this.config.showInterestingness) {
      return;
    }

    const activeView = this.getActiveView();
    const activeVgView = this.getVegaView(name);

    if (activeView.type === "1D") {
      // show basic interestingness
      activeVgView
        .change(
          "interesting",
          changeset()
            .remove(truthy)
            .insert(this.calculateInterestingness())
        )
        .resize()
        .run();
    }
  }

  /**
   * Compute an interestingness metric.
   */
  private async calculateInterestingness(
    opt: { start?: number; window?: number } = {}
  ) {
    let out: {
      view: V;
      x: number;
      value: any;
    }[] = [];

    console.time("Compute interestingness");

    const pixels = this.getActiveVegaView().signal("pixels");

    const cubes = await this.prefetchedData.get(this.activeView)!.cubes();
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

  private brushMove1D(name: V, dimension: D, value: Interval<number>) {
    if (this.activeView !== name) {
      this.switchActiveView(name);
    }

    // delete or set brush
    if (!value) {
      this.brushes.delete(dimension);
    } else {
      this.brushes.set(dimension, extent(value));
    }

    this.throttledUpdate();
  }

  private brushMove2D(
    name: V,
    dim1: D,
    dim2: D,
    value: Interval<[number, number]>
  ) {
    if (this.activeView !== name) {
      this.switchActiveView(name);
    }

    // delete or set brush
    if (!value) {
      this.brushes.delete(dim1);
      this.brushes.delete(dim2);
    } else {
      this.brushes.set(dim1, extent(value[0]));
      this.brushes.set(dim2, extent(value[1]));
    }

    this.throttledUpdate();
  }

  private getActiveView() {
    return this.views.get(this.activeView)! as View1D<D> | View2D<D>;
  }

  private getActiveVegaView() {
    return this.vegaViews.get(this.activeView)!;
  }

  private update0DView(name: V, value: number, base?: true) {
    const vgView = this.getVegaView(name);
    const table = base ? "base" : "table";

    vgView
      .change(table, changeset().modify(vgView.data(table)[0], "value", value))
      .run();
  }

  private update1DView(name: V, view: View1D<D>, hist: ndarray, base?: true) {
    const vgView = this.getVegaView(name);
    const table = base ? "base" : "table";
    const data = vgView.data(table);

    const unbin = binToData(view.dimension.binConfig!);

    const changes = changeset();

    if (hist.size === data.length) {
      for (let x = 0; x < hist.size; x++) {
        const d = data[x];

        d.key = unbin(x);
        d.value = hist.get(x);

        changes.modify(d);
      }
    } else {
      changes.remove(truthy);

      for (let x = 0; x < hist.size; x++) {
        changes.insert({
          key: unbin(x),
          value: hist.get(x)
        });
      }
    }

    vgView.change(table, changes).run();
  }

  private update2DView(name: V, view: View2D<D>, heat: ndarray, base?: true) {
    const vgView = this.getVegaView(name);
    const table = base ? "base" : "table";
    const data = vgView.data(table);

    const binConfigs = view.dimensions.map(d => d.binConfig!);
    const [binToDataX, binToDataY] = binConfigs.map(binToData);

    const changes = changeset();

    if (heat.size === data.length) {
      let i = 0;
      for (let x = 0; x < heat.shape[0]; x++) {
        for (let y = 0; y < heat.shape[1]; y++) {
          const d = data[i++];

          d.keyX = binToDataX(x);
          d.keyY = binToDataY(y);
          d.value = heat.get(x, y);

          changes.modify(d);
        }
      }
    } else {
      changes.remove(truthy);

      for (let x = 0; x < heat.shape[0]; x++) {
        for (let y = 0; y < heat.shape[1]; y++) {
          changes.insert({
            keyX: binToDataX(x),
            keyY: binToDataY(y),
            value: heat.get(x, y)
          });
        }
      }
      vgView.resize();
    }

    vgView.change(table, changes).run();
  }

  private valueFor1D(
    hists: ndarray<number>,
    floor: Interval<number>,
    ceil: Interval<number>,
    fraction: Interval<number>
  ) {
    return this.config.interpolate
      ? (1 - fraction[1]) * hists.get(floor[1]) +
          fraction[1] * hists.get(ceil[1]) -
          ((1 - fraction[0]) * hists.get(floor[0]) +
            fraction[0] * hists.get(ceil[0]))
      : hists.get(floor[1]) - hists.get(floor[0]);
  }

  private histFor1D(
    hists: ndarray<number>,
    floor: Interval<number>,
    ceil: Interval<number>,
    fraction: Interval<number>
  ) {
    return this.config.interpolate
      ? subInterpolated(
          hists.pick(floor[0], null),
          hists.pick(ceil[0], null),
          hists.pick(floor[1], null),
          hists.pick(ceil[1], null),
          fraction[0],
          fraction[1]
        )
      : sub(hists.pick(floor[0], null), hists.pick(floor[1], null));
  }

  private heatFor1D(
    hists: ndarray<number>,
    floor: Interval<number>,
    ceil: Interval<number>,
    fraction: Interval<number>
  ) {
    return this.config.interpolate
      ? subInterpolated(
          hists.pick(floor[0], null, null),
          hists.pick(ceil[0], null, null),
          hists.pick(floor[1], null, null),
          hists.pick(ceil[1], null, null),
          fraction[0],
          fraction[1]
        )
      : sub(hists.pick(floor[0], null, null), hists.pick(floor[1], null, null));
  }

  private async update1DActiveView() {
    const activeVgView = this.getActiveVegaView();
    const cubes = await this.prefetchedData.get(this.activeView)!.cubes();

    let activeBrushFloat: Interval<number> | 0 = activeVgView.signal(
      "binBrush"
    );

    let activeBrushFloor: Interval<number> = [-1, -1];
    let activeBrushCeil: Interval<number> = [-1, -1];
    let fraction: Interval<number> = [-1, -1];

    if (activeBrushFloat) {
      activeBrushFloat = extent(activeBrushFloat);
      activeBrushFloor = [
        Math.floor(activeBrushFloat[0]),
        Math.floor(activeBrushFloat[1])
      ];
      activeBrushCeil = [
        Math.ceil(activeBrushFloat[0]),
        Math.ceil(activeBrushFloat[1])
      ];
      fraction = [0, 1].map(
        i => activeBrushFloat![i] - activeBrushFloor![i]
      ) as Interval<number>;
    }

    for (const [name, view] of this.views) {
      if (name === this.activeView) {
        continue;
      }

      const data = cubes.get(name)!;
      const hists = data.hists;

      if (view.type === "0D") {
        const value = activeBrushFloat
          ? this.valueFor1D(hists, activeBrushFloor, activeBrushCeil, fraction)
          : data.noBrush.data[0];

        this.update0DView(name, value);
      } else if (view.type === "1D") {
        const hist = activeBrushFloat
          ? this.histFor1D(hists, activeBrushFloor, activeBrushCeil, fraction)
          : data.noBrush;

        this.update1DView(name, view, hist);
      } else {
        const heat = activeBrushFloat
          ? this.heatFor1D(hists, activeBrushFloor, activeBrushCeil, fraction)
          : data.noBrush;

        this.update2DView(name, view, heat);
      }
    }
  }

  private valueFor2D(
    hists: ndarray<number>,
    float: Interval<Interval<number>>,
    floor: Interval<Interval<number>>
  ) {
    return this.config.interpolate
      ? interp2d(hists, float[0][1], float[1][1]) -
          interp2d(hists, float[0][1], float[1][0]) -
          interp2d(hists, float[0][0], float[1][1]) +
          interp2d(hists, float[0][0], float[1][0])
      : hists.get(floor[0][1], floor[1][1]) -
          hists.get(floor[0][1], floor[1][0]) -
          hists.get(floor[0][0], floor[1][1]) +
          hists.get(floor[0][0], floor[1][0]);
  }

  private histFor2D(
    hists: ndarray<number>,
    float: Interval<Interval<number>>,
    floor: Interval<Interval<number>>
  ) {
    return this.config.interpolate
      ? summedAreaTableLookupInterpolateSlow(hists, float)
      : summedAreaTableLookup(
          hists.pick(floor[0][1], floor[1][1], null),
          hists.pick(floor[0][1], floor[1][0], null),
          hists.pick(floor[0][0], floor[1][1], null),
          hists.pick(floor[0][0], floor[1][0], null)
        );
  }

  private heatFor2D(
    hists: ndarray<number>,
    float: Interval<Interval<number>>,
    floor: Interval<Interval<number>>
  ) {
    return this.config.interpolate
      ? summedAreaTableLookupInterpolateSlow2D(hists, float)
      : summedAreaTableLookup(
          hists.pick(floor[0][1], floor[1][1], null, null),
          hists.pick(floor[0][1], floor[1][0], null, null),
          hists.pick(floor[0][0], floor[1][1], null, null),
          hists.pick(floor[0][0], floor[1][0], null, null)
        );
  }

  private async update2DActiveView() {
    const activeVgView = this.getActiveVegaView();
    const cubes = await this.prefetchedData.get(this.activeView)!.cubes();

    let activeBrushFloat: Interval<Interval<number>> | 0 = activeVgView.signal(
      "binBrush"
    );

    let activeBrushFloor: Interval<Interval<number>> = [[-1, -1], [-1, -1]];

    if (activeBrushFloat) {
      activeBrushFloat = [
        extent(activeBrushFloat[0]),
        extent(activeBrushFloat[1])
      ];
      activeBrushFloor = [
        [
          Math.floor(activeBrushFloat[0][0]),
          Math.floor(activeBrushFloat[0][1])
        ],
        [Math.floor(activeBrushFloat[1][0]), Math.floor(activeBrushFloat[1][1])]
      ];
    }

    for (const [name, view] of this.views) {
      if (name === this.activeView) {
        continue;
      }
      const data = cubes.get(name)!;
      const hists = data.hists;

      if (view.type === "0D") {
        const value = activeBrushFloat
          ? this.valueFor2D(hists, activeBrushFloat, activeBrushFloor)
          : data.noBrush[0];

        this.update0DView(name, value);
      } else if (view.type === "1D") {
        const hist = activeBrushFloat
          ? this.histFor2D(hists, activeBrushFloat, activeBrushFloor)
          : data.noBrush;

        this.update1DView(name, view, hist);
      } else {
        const heat = activeBrushFloat
          ? this.heatFor2D(hists, activeBrushFloat, activeBrushFloor)
          : data.noBrush;

        this.update2DView(name, view, heat);
      }
    }
  }

  private async update() {
    if (this.prefetchedData.size > 1) {
      this.clearPrefetched();
    }

    if (this.getActiveView().type === "1D") {
      await this.update1DActiveView();
    } else {
      await this.update2DActiveView();
    }
  }
}
