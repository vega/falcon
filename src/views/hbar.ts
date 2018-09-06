import { Config } from "./../config";
import { EncodeEntry, parse, Spec, View, Warn } from "vega-lib";
import { View0D } from "../api";
import { darkerBlue } from "./histogram";

export function createHorizontalBarView(
  el: Element,
  view: View0D,
  config: Config
) {
  const barEncodeBase: EncodeEntry = {
    y: { value: 4 },
    y2: { signal: "height - 4" },
    x: { scale: "x", field: "value" },
    x2: { scale: "x", value: 0 },
    tooltip: { field: "value" }
  };

  const largeEnough =
    "(datum.datum.bounds.x2 - datum.datum.bounds.x1) > (datum.bounds.x2 - datum.bounds.x1) * 1.2";

  const vgSpec: Spec = {
    width: config.barWidth,
    height: 28,
    padding: 5,

    signals: [
      { name: "ready", value: false },
      { name: "approximate", value: false }
    ],

    data: [
      {
        name: "base"
      },
      {
        name: "table"
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
            ...barEncodeBase,
            fill: { value: "#000" },
            opacity: { value: 0.07 }
          }
        }
      },
      {
        type: "rect",
        from: { data: "table" },
        name: "bar",
        encode: {
          enter: {
            ...barEncodeBase,
            fill: { value: darkerBlue }
          },
          update: {
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
            text: { signal: "format(datum.datum.value, 'd')" },
            opacity: { value: 0 }
          }
        }
      },
      {
        type: "text",
        from: { data: "dummy" },
        encode: {
          enter: {
            y: { signal: "height / 2" },
            x: {
              signal: `${largeEnough} ? (datum.datum.bounds.x1 + datum.datum.bounds.x2) / 2 : datum.datum.bounds.x2 + 10`
            },
            text: { field: "text" },
            align: {
              signal: `${largeEnough} ? 'center' : 'left'`
            },
            baseline: { value: "middle" },
            fill: {
              signal: `${largeEnough} ? 'white' : 'black'`
            }
          }
        }
      }
    ]
  };

  const runtime = parse(vgSpec);

  const vgView = new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer("svg");

  vgView["_spec"] = vgSpec;
  return vgView;
}
