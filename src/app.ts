import ndarray from "ndarray";
import interpolate from "ndarray-linear-interpolate";
import { changeset, truthy, View as VgView } from "vega";
import { BinConfig, Logger, View, View1D, View2D, Views } from "./api";
import { Interval } from "./basic";
import { Config, DEFAULT_CONFIG } from "./config";
import { Index, DataBase, Hists } from "./db";
import {
  bin,
  binTime,
  binToData,
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

/**
 * A simple handler that takes a promise and evaulates the last function it receives on it.
 * Can be cancelled so that the result of the promise is simply ignored.
 */
class Runner<V> {
  private _data: V;

  private func;

  private cancelled = false;

  constructor(private _promise: Promise<V>) {
    _promise.then(data => {
      if (!this.cancelled) {
        this._data = data;
        this.func && this.func(data);
      } else {
        console.warn("Promise resolved after runner was cancelled.");
      }
    });
  }

  /**
   * Get a promise which may be rejected when the original promise was cancelled.
   */
  public async promise(): Promise<V> {
    return new Promise<V>(resolve => {
      this._promise.then(value => {
        if (this.cancelled) {
          console.info(
            "Runner has been cancelled so we are dropping the result."
          );
        } else {
          resolve(value);
        }
      });
    });
  }

  /**
   * Run the function immediately or when the promise resolves.
   * Only the last function will be evaluated when then promise resolves.
   */
  public run(f: (data: V) => void) {
    if (this.cancelled) {
      throw new Error("Runner has been cancelled.");
    }

    this.func = f;

    if (this._data) {
      this.func(this._data);
    }
  }

  /**
   * Override the dataset.
   */
  public set data(data: V) {
    if (!this._data) {
      throw new Error("Promise has not resolved yet.");
    }
    this._data = data;
  }

  /**
   * Get the resolved dataset or undefined.
   */
  public get data() {
    return this._data;
  }

  /**
   * Cancel the promise.
   */
  public cancel() {
    this.cancelled = true;
  }
}

/**
 * Convert a map of promises to a map of runners.
 */
function runnerify<T, U>(map: Map<T, Promise<U> | U>): Map<T, Runner<U>> {
  const out = new Map<T, Runner<U>>();

  for (const [key, value] of map) {
    if (value instanceof Promise) {
      out.set(key, new Runner(value));
    } else {
      const p = new Promise<U>((resolve, _reject) => {
        resolve(value);
      });
      out.set(key, new Runner(p));
    }
  }

  return out;
}

function cancelAll<T, U>(runners: Map<T, Runner<U>>) {
  for (const runner of runners.values()) {
    runner.cancel();
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
  private prefetchedData = new Map<V, Map<V, Runner<Hists>>>();

  private readonly config: Config;

  private logger?: Logger<V>;

  private readonly highRes1D: number;
  private readonly highRes2D: number;

  private throttledUpdate: () => void;

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

    if (this.config.progressiveInteractions && this.db.blocking) {
      console.error(
        "Progressive iteractions are not supported with blocking DBs."
      );
      this.config.progressiveInteractions = false;
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

    const debouncedPreload = debounce(async () => {
      if (mouseIsDown) {
        return;
      }

      console.info("App is idle. Prefetching all views.");

      for (const [name, view] of this.views) {
        if (view.type !== "0D") {
          await this.prefetchView(name, false);
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

      await vegaView.runAsync();
      this.vegaViews.set(name, vegaView);

      this.update0DView(name, await this.db.length(), true);
      await this.update0DView(name, await this.db.length());
    } else if (view.type === "1D") {
      const binConfig = (view.dimension.time ? binTime : bin)(
        view.dimension.bins,
        view.dimension.extent ||
          (await this.db.getDimensionExtent(view.dimension))
      );
      view.dimension.binConfig = binConfig;

      vegaView = createHistogramView(el, view, this.config, !!this.logger);

      await vegaView.runAsync();
      this.vegaViews.set(name, vegaView);

      const { hist } = await this.db.histogram(view.dimension);

      if (this.config.showUnfiltered || this.config.toggleUnfiltered) {
        await this.update1DView(name, view, hist, true);
      }
      await this.update1DView(name, view, hist);

      vegaView.addSignalListener("brush", async (_name, value) => {
        await vegaView.runAsync();

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
          await vegaView.runAsync();
          // if you zoom, we activate the view
          if (this.activeView !== name) {
            await this.switchActiveView(name, false);
          }

          updateHistDebounced(value);
        });
      }

      if (this.logger) {
        this.logger.attach(name, vegaView);
      }
    } else {
      for (const dimension of view.dimensions) {
        const binConfig = (dimension.time ? binTime : bin)(
          dimension.bins,
          dimension.extent || (await this.db.getDimensionExtent(dimension))
        );
        dimension.binConfig = binConfig;
      }

      vegaView = createHeatmapView(el, view, this.config);

      await vegaView.runAsync();
      this.vegaViews.set(name, vegaView);

      const data = await this.db.heatmap(view.dimensions);
      if (this.config.showUnfiltered || this.config.toggleUnfiltered) {
        await this.update2DView(name, view, data, true);
      }
      await this.update2DView(name, view, data);

      vegaView.addSignalListener("dataBrush", async (_name, value) => {
        await vegaView.runAsync();

        this.brushMove2D(
          name,
          view.dimensions[0].name,
          view.dimensions[1].name,
          value
        );
      });
    }

    if (view.type !== "0D") {
      const cb = async () => {
        await this.prefetchView(name, !!this.config.progressiveInteractions);
      };

      el["on" + this.config.prefetchOn] = cb;
      el.ontouchstart = cb;

      const lowResPixels = this.getPixels(
        view,
        !!this.config.progressiveInteractions
      );
      await this.setPixels(name, lowResPixels);

      if (this.config.debugViewInteractions) {
        vegaView.container()!.style.border = "1px solid green";
      }
    }

    vegaView.resize().runAsync();
  }

  /**
   * The domain has changed so we need to zoom the chart.
   */
  private async updateHistogram(domain: Interval<number>) {
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
      await this.prefetchView(name, false);

      await vegaView.signal("bin", newBinConfig).runAsync();

      if (this.config.showUnfiltered || this.config.toggleUnfiltered) {
        const { hist, noBrush } = await this.db.histogram(
          view.dimension,
          omit(this.brushes, view.dimension.name)
        );
        this.update1DView(name, view, noBrush, true);
        await this.update1DView(name, view, hist);
      } else {
        const { hist } = await this.db.histogram(view.dimension);
        await this.update1DView(name, view, hist);
      }
    }
  }

  public getPixels(view: View1D<D>, progressive: boolean): number;
  public getPixels(view: View2D<D>, progressive: boolean): Interval<number>;
  public getPixels(
    view: View1D<D> | View2D<D>,
    progressive: boolean
  ): number | Interval<number>;
  public getPixels(
    view: View1D<D> | View2D<D>,
    progressive: boolean
  ): number | Interval<number> {
    if (view.type === "1D") {
      const binConfig = view.dimension.binConfig!;

      return progressive ? numBins(binConfig) : this.highResPixels(binConfig);
    } else if (view.type === "2D") {
      return progressive
        ? [
            numBins(view.dimensions[0].binConfig!),
            numBins(view.dimensions[1].binConfig!)
          ]
        : [this.highRes2D, this.highRes2D];
    }
    throw new Error("0D cannot be an active view.");
  }

  /**
   * Get data for the view so that we can brush in it.
   */
  public async prefetchView(name: V, progressive = true) {
    if (mouseIsDown) {
      return;
    }

    if (this.prefetchedData.has(name)) {
      // we are already loading this view
      return;
    }

    const view = this.views.get(name)!;

    if (progressive) {
      // refine how progressive we want to be
      progressive =
        this.config.progressiveInteractions === true ||
        (this.config.progressiveInteractions === "only2D" &&
          view.type === "2D");
    }

    let cubes: Index<V>;

    if (view.type === "1D") {
      const lowResPixels = this.getPixels(view, progressive);
      await this.setPixels(name, lowResPixels);
      cubes = this.load1DData(name, view, lowResPixels);
    } else if (view.type === "2D") {
      const lowResPixels = this.getPixels(view, progressive);
      await this.setPixels(name, lowResPixels);
      cubes = this.load2DData(name, view, lowResPixels);
    } else {
      throw new Error("0D cannot be an active view.");
    }

    const runners = runnerify(cubes);
    this.prefetchedData.set(name, runners);

    for (const [n, r] of runners) {
      r.promise().then(async () => {
        const vegaView = this.getVegaView(n);
        await vegaView
          .signal("pending", false)
          .signal("approximate", progressive && this.config.interpolate)
          .runAsync();

        if (
          (this.config.prefetchOn === "mouseenter" ||
            this.db.blocking === false) &&
          this.views.get(n)!.type !== "0D"
        ) {
          if (this.config.debugViewInteractions) {
            vegaView.container()!.style.border = "1px solid green";
          }
          vegaView.container()!.style.cursor = "";
          (vegaView
            .container()!
            .children.item(0) as HTMLElement).style.pointerEvents = "all";
        }
      });
    }
  }

  private loadHighResData(name: V) {
    if (this.activeView !== name) {
      console.info(`Ignored high res request since ${name} is not active.`);
      return;
    }

    // the runners for the view so we can later make sure it's still the same
    const runners = this.prefetchedData.get(name)!;

    const view = this.getActiveView();

    if (
      this.config.progressiveInteractions === true ||
      (this.config.progressiveInteractions === "only2D" && view.type === "2D")
    ) {
      let highResCubes: Index<V>;

      let highResPixels: number | Interval<number>;
      if (view.type === "1D") {
        highResPixels = this.highResPixels(view.dimension.binConfig!);
        highResCubes = this.load1DData(name, view, highResPixels);
      } else {
        highResPixels = [this.highRes2D, this.highRes2D];
        highResCubes = this.load2DData(name, view, highResPixels);
      }

      // when we don't use interpolation, let's wait before setting the runners
      const histsPromises = Array.from<[V, Promise<Hists>]>(
        highResCubes.entries() as any
      );
      Promise.all(histsPromises.map(d => d[1])).then(async hists => {
        const index = this.prefetchedData.get(name)!;
        if (index === runners) {
          await this.setPixels(name, highResPixels);

          // replace the prefetched data with high res data
          for (let i = 0; i < histsPromises.length; i++) {
            const v = histsPromises[i][0];
            index.get(v)!.data = hists[i];

            const vegaView = this.getVegaView(v);
            await vegaView
              .signal("pending", false)
              .signal("approximate", false)
              .runAsync();

            if (this.views.get(v)!.type !== "0D") {
              if (this.config.debugViewInteractions) {
                vegaView.container()!.style.border = "1px solid green";
              }
              vegaView.container()!.style.cursor = "";
              (vegaView
                .container()!
                .children.item(0) as HTMLElement).style.pointerEvents = "all";
            }
          }

          this.throttledUpdate();

          console.info(
            `High res data available for ${name} with ${highResPixels} pixels.`
          );
        } else {
          console.info(`Received outdated high res data for ${name}.`);
        }
      });
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

  private async setPixels(name: V, pixels: number | Interval<number>) {
    return await this.vegaViews
      .get(name)!
      .signal("pixels", pixels)
      .runAsync();
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
    for (const name of this.vegaViews.keys()) {
      if (name !== this.activeView) {
        const map = this.prefetchedData.get(name);

        if (map) {
          cancelAll(map);

          this.prefetchedData.delete(name);
        }
      }
    }
  }

  /**
   * Switch which view is active.
   */
  private async switchActiveView(name: V, approximate = true) {
    console.info(`Active view ${this.activeView} => ${name}`);

    this.activeView = name;

    if (approximate) {
      let runners = this.prefetchedData.get(name)!;

      if (!runners) {
        // could happen when the user clicks reset without preload on hover
        await this.prefetchView(name);
        runners = this.prefetchedData.get(name)!;
      }

      Promise.all(runners.values()).then(() => {
        const index = this.prefetchedData.get(name)!;
        if (index === runners) {
          this.loadHighResData(name);
        } else {
          console.info(
            `Won't load high res data for ${name} since the request is outdated.`
          );
        }
      });
    }
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

  private async update0DView(name: V, value: number, base?: true) {
    const vgView = this.getVegaView(name);
    const table = base ? "base" : "table";

    vgView.change(
      table,
      changeset().modify(vgView.data(table)[0], "value", value)
    );

    if (!base) {
      // we will run the dataflow when we update the filtered data
      await vgView.runAsync();
    }
  }

  private async update1DView(
    name: V,
    view: View1D<D>,
    hist: ndarray,
    base?: true
  ) {
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

    vgView.change(table, changes);
    if (!base) {
      // we will run the dataflow when we update the filtered data
      await vgView.runAsync();
    }
  }

  private async update2DView(
    name: V,
    view: View2D<D>,
    heat: ndarray,
    base?: true
  ) {
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

    vgView.change(table, changes);
    if (!base) {
      // we will run the dataflow when we update the filtered data
      await vgView.runAsync();
    }
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
    const cubes = this.prefetchedData.get(this.activeView)!;

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

      const runner = cubes.get(name)!;

      if (!runner.data) {
        const vegaView = this.getVegaView(name);
        await vegaView.signal("pending", true).runAsync();

        if (
          (this.config.prefetchOn === "mouseenter" ||
            this.db.blocking === false) &&
          this.views.get(name)!.type !== "0D"
        ) {
          if (this.config.debugViewInteractions) {
            vegaView.container()!.style.border = "1px solid orange";
          }
          vegaView.container()!.style.cursor = "wait";
          (vegaView
            .container()!
            .children.item(0) as HTMLElement).style.pointerEvents = "none";
        }
      }

      // run when the promise resolves
      runner.run(data => {
        const hists = data.hists;

        if (view.type === "0D") {
          const value = activeBrushFloat
            ? this.valueFor1D(
                hists,
                activeBrushFloor,
                activeBrushCeil,
                fraction
              )
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
      });
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
    const cubes = this.prefetchedData.get(this.activeView)!;

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
      const runner = cubes.get(name)!;

      if (!runner.data) {
        const vegaView = this.getVegaView(name);
        await vegaView.signal("pending", true).runAsync();

        if (
          (this.config.prefetchOn === "mouseenter" ||
            this.db.blocking === false) &&
          this.views.get(name)!.type !== "0D"
        ) {
          if (this.config.debugViewInteractions) {
            vegaView.container()!.style.border = "1px solid orange";
          }
          vegaView.container()!.style.cursor = "wait";
          (vegaView
            .container()!
            .children.item(0) as HTMLElement).style.pointerEvents = "none";
        }
      }

      // run when the promise resolves
      runner.run(data => {
        const hists = data.hists;

        if (view.type === "0D") {
          const value = activeBrushFloat
            ? this.valueFor2D(hists, activeBrushFloat, activeBrushFloor)
            : data.noBrush.data[0];

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
      });
    }
  }

  private async update() {
    if (this.prefetchedData.size > 1) {
      await this.clearPrefetched();
    }

    // TODO: why do we need to to make reset work correctly?
    // this.getActiveVegaView().runAsync();

    if (this.getActiveView().type === "1D") {
      await this.update1DActiveView();
    } else {
      await this.update2DActiveView();
    }
  }
}
