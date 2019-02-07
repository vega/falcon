import {
  AreaEncodeEntry,
  changeset,
  parse,
  Spec,
  View as VgView,
  Warn
} from "vega-lib";
import { extent } from "../util";
import { Logger, Views } from "./../api";
import { Interval } from "./../basic";

function vgSpec(dimensions) {
  const areaEncoding: AreaEncodeEntry = {
    y: { scale: "timeScale", field: "time" },
    x: { scale: "brushScale", field: "start" },
    x2: { scale: "brushScale", field: "end" }
  };

  const spec: Spec = {
    width: 300,
    height: 500,
    padding: {
      left: 30,
      right: 5,
      top: 5,
      bottom: 20
    },

    data: [
      {
        name: "logs"
      },
      {
        name: "active_logs",
        source: "logs",
        transform: [{ type: "filter", expr: "datum.active === true" }]
      }
    ],

    scales: [
      {
        name: "brushScale",
        type: "linear",
        range: "width",
        domain: [0, 600]
      },
      {
        name: "timeScale",
        type: "time",
        range: "height",
        domain: { data: "logs", field: "time" }
      },
      {
        name: "color",
        type: "ordinal",
        domain: dimensions,
        range: ["#A7D1A8", "#FBA35C", "#D6ACD6"]
      }
    ],

    axes: [
      { orient: "top", scale: "brushScale", title: "Brush Location in Pixels" },
      { orient: "left", scale: "timeScale", title: "Time" }
    ],

    legends: [{ fill: "color", direction: "horizontal", orient: "bottom" }],

    marks: [
      {
        type: "group",
        from: {
          facet: {
            name: "faceted",
            data: "logs",
            groupby: ["dimension", "viewAction"]
          }
        },
        clip: true,
        marks: [
          {
            type: "area",
            from: {
              data: "faceted"
            },
            encode: {
              enter: {
                orient: { value: "horizontal" },
                opacity: { value: 0.05 }
              },
              update: {
                ...areaEncoding,
                fill: { scale: "color", field: "dimension" }
              }
            }
          },
          {
            type: "area",
            from: {
              data: "faceted"
            },
            encode: {
              enter: {
                orient: { value: "horizontal" }
              },
              update: {
                ...areaEncoding,
                stroke: { scale: "color", field: "dimension" }
              }
            }
          }
        ]
      },
      {
        type: "group",
        from: {
          facet: {
            name: "faceted",
            data: "active_logs",
            groupby: ["dimension", "action", "viewAction"]
          }
        },
        marks: [
          {
            type: "area",
            from: {
              data: "faceted"
            },
            encode: {
              enter: {
                orient: { value: "horizontal" },
                opacity: { value: 0.75 }
              },
              update: {
                ...areaEncoding,
                fill: { scale: "color", field: "dimension" }
              }
            }
          }
        ]
      }
    ],
    config: {
      mark: {
        fill: "#5DA2FC"
      },
      background: "#414141",
      title: { color: "#fff" },
      style: {
        title: { fill: "#fff", fontSize: 16 },
        "guide-label": { fill: "#fff", fontSize: 11, font: "FiraGo" },
        "guide-title": {
          fill: "#fff",
          fontSize: 14,
          font: "FiraGo",
          fontWeight: 500
        }
      },
      axis: { domainColor: "#fff", gridColor: "#666", tickColor: "#fff" },
      legend: { padding: 0, rowPadding: 6, titlePadding: 10 },
      view: {
        stroke: "#666"
      }
    }
  };

  return spec;
}

interface Record<V extends string> {
  time: Date;
  dimension: V;
  start: number;
  end: number;
  active: boolean;
  action: number;
  viewAction: number;
}

/**
 * A logger that renders a timeline visualization of the brush interactions.
 */
export class TimelineLogger<V extends string, D extends string>
  implements Logger<V> {
  private vgView: VgView;

  private action: number = 0;
  private viewActions: { [key: string]: number } = {};
  private active: V;
  private brushes = new Map<V, Interval<number>>();

  constructor(el: Element, views: Views<V, D>) {
    const histViews: V[] = [];

    for (const [n, v] of views) {
      if (v.type === "1D") {
        histViews.push(n);
      }
    }

    const runtime = parse(vgSpec(histViews));

    this.vgView = new VgView(runtime)
      .logLevel(Warn)
      .initialize(el)
      .renderer("canvas")
      .run();
  }

  public attach(name: V, view: VgView) {
    this.viewActions[name] = 0;

    view.addSignalListener("down", () => {
      this.action++;
    });

    view.addSignalListener("pixelBrush", (_, brush) => {
      brush = extent(brush);

      if (this.active !== name) {
        this.active = name;
        this.action++;
      }

      const changes = changeset();
      const now = new Date();

      for (const [n, b] of this.brushes) {
        if (n !== name) {
          changes.insert({
            time: now,
            dimension: n,
            start: b[0],
            end: b[1],
            active: false,
            action: this.action,
            viewAction: this.viewActions[n]
          } as Record<V>);
        }
      }

      if (brush === 0) {
        const b = this.brushes.get(name)!;
        changes.insert({
          time: now,
          dimension: name,
          start: b[0],
          end: b[1],
          active: false,
          action: this.action,
          viewAction: this.viewActions[name]
        } as Record<V>);

        this.viewActions[name]++;
        this.brushes.delete(name);
      } else {
        this.brushes.set(name, brush);

        changes.insert({
          time: now,
          dimension: name,
          start: brush[0],
          end: brush[1],
          active: true,
          action: this.action,
          viewAction: this.viewActions[name]
        } as Record<V>);
      }

      this.vgView.change("logs", changes).run();
    });
  }
}
