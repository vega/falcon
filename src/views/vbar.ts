import { Config } from "./../config";
import { EncodeEntry, parse, Spec, View, Warn } from "vega-lib";
import { View0D } from "../api";
import { darkerBlue, loadingMarks } from "./histogram";

export function createVerticalBarView(
  el: Element,
  view: View0D,
  config: Config
) {
  const barEncodeBase: EncodeEntry = {
    x: { value: 4 },
    x2: { signal: "width - 4" },
    y: { scale: "y", field: "value" },
    y2: { scale: "y", value: 0 },
    tooltip: { field: "value" }
  };

  const largeEnough =
    "(datum.datum.bounds.y2 - datum.datum.bounds.y1) > (datum.bounds.x2 - datum.bounds.x1) * 1.2";

  const vgSpec: Spec = {
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
    },
    height: config.barHeight,
    width: 28,
    padding: 5,

    signals: [
      { name: "pending", value: false },
      { name: "approximate", value: false }
    ],

    data: [
      {
        // base = unfiltered data
        name: "base",
        values: [{ value: 0 }]
      },
      {
        name: "table",
        values: [{ value: 0 }]
      }
    ],

    scales: [
      {
        type: "linear",
        name: "y",
        domain: {
          fields: [
            { data: "table", field: "value" },
            { data: "base", field: "value" }
          ]
        },
        nice: true,
        range: "height",
        zero: true
      }
    ],

    axes: [
      {
        orient: "left",
        scale: "y",
        title: view.title,
        grid: true,
        tickCount: { signal: "ceil(height/40)" }
      }
    ],

    marks: [
      {
        type: "rect",
        from: { data: "base" },
        encode: {
          enter: {
            fill: { value: "#fff" },
            opacity: { value: 0.3 }
          },
          update: barEncodeBase
        }
      },
      {
        type: "rect",
        from: { data: "table" },
        name: "bar",
        encode: {
          enter: {
            fill: { value: darkerBlue }
          },
          update: {
            ...barEncodeBase,
            opacity: { signal: "approximate ? 0.7 : 1" }
          }
        }
      },
      {
        type: "text",
        from: { data: "bar" },
        name: "dummy",
        encode: {
          enter: {
            opacity: { value: 0 }
          },
          update: {
            text: { signal: "format(datum.datum.value, ',d')" }
          }
        }
      },
      {
        type: "text",
        from: { data: "dummy" },
        encode: {
          enter: {
            baseline: { value: "middle" },
            angle: { value: -90 }
          },
          update: {
            x: { signal: "width / 2" },
            y: {
              signal: `${largeEnough} ? (datum.datum.bounds.y1 + datum.datum.bounds.y2) / 2 : datum.datum.bounds.y1 - 10`
            },
            text: { field: "text" },
            align: {
              signal: `${largeEnough} ? 'center' : 'left'`
            },
            fill: {
              signal: `${largeEnough} ? 'white' : 'white'`
            }
          }
        }
      },
      ...loadingMarks("height", true)
    ]
  };

  const runtime = parse(vgSpec);

  const vgView = new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer(config.renderer)
    .run();

  vgView["_spec"] = vgSpec;
  return vgView;
}
