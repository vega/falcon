import {
  View as VgView,
  parse,
  Warn,
  Spec,
  changeset,
  AreaEncodeEntry
} from "vega-lib";
import { Logger, Interval, extent } from "../src";

function vgSpec(dimensions) {
  const areaEncoding: AreaEncodeEntry = {
    y: { scale: "yscale", field: "time" },
    x: { scale: "xscale", field: "start" },
    x2: { scale: "xscale", field: "end" }
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
        name: "xscale",
        type: "linear",
        range: "width",
        domain: [0, 600]
      },
      {
        name: "yscale",
        type: "time",
        range: "height",
        domain: { data: "logs", field: "time" }
      },
      {
        name: "color",
        type: "ordinal",
        domain: dimensions,
        range: "category"
      }
    ],

    axes: [
      { orient: "top", scale: "xscale", title: "Brush Location in Pixels" },
      { orient: "left", scale: "yscale", title: "Time" }
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
    ]
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

export class VisLogger<V extends string> implements Logger<V> {
  private vgView: VgView;

  private action: number = 0;
  private viewActions: { [key: string]: number } = {};
  private active: V;
  private brushes = new Map<V, Interval<number>>();

  constructor(el: Element, views: V[]) {
    const runtime = parse(vgSpec(views));

    this.vgView = new VgView(runtime)
      .logLevel(Warn)
      .initialize(el)
      .renderer("canvas")
      .run();
  }

  public attach(name: V, view: VgView) {
    this.viewActions[name] = 0;

    view.addSignalListener("pixelBrush", (_, brush) => {
      brush = extent(brush);

      if (this.active !== name) {
        this.active = name;
        this.action++;
      }

      const changes = changeset();

      for (const [n, b] of this.brushes) {
        if (n !== name) {
          changes.insert({
            time: new Date(),
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
          time: new Date(),
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
          time: new Date(),
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

  public hasUnsentData() {
    return false;
  }
}
