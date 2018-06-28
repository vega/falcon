import { EncodeEntry, parse, Spec, View, Warn } from "vega-lib";
import { AXIS_Y_EXTENT } from "../config";

export const BAR_HEIGHT = 450;

export function createBarView(el: Element, view: View0D) {
  const barEncodeBase: EncodeEntry = {
    x: { value: 4 },
    x2: { signal: "width - 4" },
    y: { scale: "y", field: "value" },
    y2: { scale: "y", value: 0 },
    tooltip: { field: "value" }
  };

  const vgSpec: Spec = {
    padding: 5,
    height: BAR_HEIGHT,
    width: 28,

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

    axes: [{ orient: "left", scale: "y", title: view.title, grid: true }],

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
        encode: {
          enter: {
            ...barEncodeBase,
            fill: { value: "#4c78a8" }
          }
        }
      }
    ],

    config: { axisY: { minExtent: AXIS_Y_EXTENT } }
  };

  const runtime = parse(vgSpec);

  return new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer("svg");
}
