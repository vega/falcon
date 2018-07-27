import { BehaviorSubject, fromEvent, merge, Observable } from "rxjs";
import {
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  scan,
  startWith,
  withLatestFrom
} from "rxjs/operators";
import { Logger, View, Views } from "./api";
import { Interval } from "./basic";
import { Config, DEFAULT_CONFIG } from "./config";
import { DataBase } from "./db";
import { bin, binTime, omit } from "./util";
import {
  createBarView,
  createHeatmapView,
  createHistogramView,
  createTextView,
  HEATMAP_WIDTH,
  HISTOGRAM_WIDTH
} from "./views";

const mouseDown$ = fromEvent(document, "mousedown", { capture: false });
const mouseUp$ = fromEvent(document, "mouseup", { capture: false });

const mouseIsDown$ = new BehaviorSubject(false);

merge(mouseDown$.pipe(mapTo(true)), mouseUp$.pipe(mapTo(false))).subscribe(
  value => {
    mouseIsDown$.next(value);
  }
);

export async function createApp<V extends string, D extends string>(
  views: Views<V, D>,
  db: DataBase<V, D>,
  opt: {
    config?: Partial<Config>;
    logger?: Logger<V>;
    cb?: () => void;
  }
) {
  const config = { ...DEFAULT_CONFIG, ...((opt && opt.config) || {}) };
  const logger = opt && opt.logger;

  await db.initialize();

  type Brush = { dimension: D; brush: Interval<number> };

  const brushes: Observable<Brush>[] = [];
  const mouseover: Observable<V>[] = [];

  for (const [name, view] of views.entries()) {
    console.log(name);
    const el = view.el!;
    if (view.type === "0D") {
      const vegaView = (config.zeroDBar ? createBarView : createTextView)(
        el,
        view
      );
    } else if (view.type === "1D") {
      const binConfig = (view.dimension.time ? binTime : bin)(
        view.dimension.bins,
        view.dimension.extent
      );
      view.dimension.binConfig = binConfig;

      const vegaView = createHistogramView(el, view, config, !!logger);

      const brush = Observable.create(observer => {
        vegaView.addSignalListener(
          "brush",
          (_name, value: Interval<number>) => {
            observer.next({
              name,
              dimension: view.dimension.name,
              brush: value
            });
          }
        );
      });

      brushes.push(brush);

      const viewMouseover = Observable.create(observer => {
        vegaView.addEventListener("mouseover", () => {
          observer.next(name);
        });
      });

      mouseover.push(viewMouseover);
    } else {
      for (const dimension of view.dimensions) {
        const binConfig = (dimension.time ? binTime : bin)(
          dimension.bins,
          dimension.extent
        );
        dimension.binConfig = binConfig;
      }

      const vegaView = createHeatmapView(el, view);

      const brush = Observable.create(observer => {
        vegaView.addSignalListener("brush", (_name, value) => {
          observer.next({
            dimension: view.dimensions[0].name,
            brush: value[0]
          });
          observer.next({
            dimension: view.dimensions[1].name,
            brush: value[1]
          });
        });
      });

      brushes.push(brush);

      const viewMouseover = Observable.create(observer => {
        vegaView.addEventListener("mouseover", () => {
          observer.next(name);
        });
      });

      mouseover.push(viewMouseover);
    }
  }

  const brush$ = merge(...brushes);
  const mouseover$ = merge(...mouseover);

  const iteration$ = brush$.pipe(
    distinctUntilChanged(),
    scan(acc => acc + 1, 0)
  );

  const view$ = mouseover$.pipe(map(name => views.get(name)!));

  const otherViews$ = mouseover$.pipe(map(name => omit(views, name)));

  const hoveredDimensions$ = view$.pipe(
    map(view => {
      switch (view.type) {
        case "1D":
          return [view.dimension.name];
        case "2D":
          return view.dimensions.map(d => d.name);
        case "0D":
        default:
          return [] as D[];
      }
    })
  );

  const brushes$ = brush$.pipe(
    filter(brush => !!brush.brush),
    scan<Brush, Map<D, Interval<number>>>(
      (acc, curr) => acc.set(curr.dimension, curr.brush),
      new Map()
    ),
    startWith(new Map<D, Interval<number>>())
  );

  const otherBrushes$ = hoveredDimensions$.pipe(
    withLatestFrom(brushes$, (dims, brushes) => ({ dims, brushes })),
    map(({ dims, brushes }) => omit(brushes, ...dims))
  );

  const prefetchedData$ = mouseover$.pipe(
    withLatestFrom(
      view$,
      otherViews$,
      otherBrushes$,
      (name, view, otherViews, brushes) => ({
        name,
        view,
        otherViews,
        brushes
      })
    ),
    map(({ view, otherViews, brushes }) =>
      prefetch(view, otherViews, brushes, db)
    )
  );

  // otherViews$.subscribe(console.log);
  // otherBrushes$.subscribe(console.log);
  // iteration$.subscribe(console.log);

  prefetchedData$.subscribe(console.log);
}

function prefetch<V extends string, D extends string>(
  view: View<D>,
  otherViews,
  brushes,
  db: DataBase<V, D>
) {
  console.log(view, otherViews, brushes, db);
  if (view.type === "1D") {
    return db.loadData1D(view, HISTOGRAM_WIDTH, otherViews, brushes);
  } else if (view.type === "2D") {
    return db.loadData2D(
      view,
      [HEATMAP_WIDTH, HEATMAP_WIDTH],
      otherViews,
      brushes
    );
  } else {
    throw new Error("0D cannot be an active view.");
  }
}
