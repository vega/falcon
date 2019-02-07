import { Config } from "./../config";
import { EncodeEntry, parse, Spec, View, Warn } from "vega-lib";
import { View0D } from "../api";
import { darkerBlue, loadingMarks } from "./histogram";

export function createHorizontalBarView(
  el: Element,
  view: View0D,
  config: Config
) {
  const barEnterEncodeBase: EncodeEntry = {
    y: { value: 4 },
    y2: { signal: "height - 4" }
  };

  const barUpdateEncodeBase: EncodeEntry = {
    x: { scale: "x", field: "value" },
    x2: { scale: "x", value: 0 },
    tooltip: { field: "value" }
  };

  const largeEnough =
    "(datum.datum.bounds.x2 - datum.datum.bounds.x1) > (datum.bounds.x2 - datum.bounds.x1) * 1.2";

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
    width: config.barWidth,
    height: 28,
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
        name: "x",
        domain: {
          fields: [
            { data: "table", field: "value" },
            { data: "base", field: "value" }
          ]
        },
        nice: true,
        range: "width",
        zero: true
      }
    ],

    axes: [
      {
        orient: "bottom",
        scale: "x",
        title: view.title,
        grid: true,
        tickCount: { signal: "ceil(width/40)" },
        labelOverlap: true
      }
    ],

    marks: [
      {
        type: "rect",
        from: { data: "base" },
        encode: {
          enter: {
            ...barEnterEncodeBase,
            fill: { value: "#fff" },
            opacity: { value: 0.07 }
          },
          update: barUpdateEncodeBase
        }
      },
      {
        type: "rect",
        from: { data: "table" },
        name: "bar",
        encode: {
          enter: {
            ...barEnterEncodeBase,
            fill: { value: darkerBlue }
          },
          update: {
            ...barUpdateEncodeBase,
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
            y: { signal: "height / 2" },
            baseline: { value: "middle" }
          },
          update: {
            x: {
              signal: `${largeEnough} ? (datum.datum.bounds.x1 + datum.datum.bounds.x2) / 2 : datum.datum.bounds.x2 + 10`
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
      ...loadingMarks("height")
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
