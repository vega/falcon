import { Config } from "./../config";
import { EncodeEntry, parse, Spec, View, Warn } from "vega-lib";
import { View0D } from "../api";
import { darkerBlue } from "./histogram";

export const AXIS_Y_EXTENT = 50;

export function createBarView(el: Element, view: View0D, config: Config) {
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
    height: config.barHeight,
    width: 28,
    padding: 5,

    signals: [{ name: "approximate", value: false }],

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
            x: { signal: "width / 2" },
            y: {
              signal: `${largeEnough} ? (datum.datum.bounds.y1 + datum.datum.bounds.y2) / 2 : datum.datum.bounds.y1 - 10`
            },
            text: { field: "text" },
            align: {
              signal: `${largeEnough} ? 'center' : 'left'`
            },
            baseline: { value: "middle" },
            angle: { value: -90 },
            fill: {
              signal: `${largeEnough} ? 'white' : 'black'`
            }
          }
        }
      }
    ],

    config: { axisY: { minExtent: AXIS_Y_EXTENT } }
  };

  const runtime = parse(vgSpec);

  const vgView = new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer("svg");

  vgView["_spec"] = vgSpec;
  return vgView;
}
