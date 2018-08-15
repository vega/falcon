import { Config } from "./../config";
import { EncodeEntry, parse, Spec, View } from "vega-lib";
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
        encode: {
          enter: {
            ...barEncodeBase,
            fill: { value: darkerBlue }
          },
          update: {
            opacity: { signal: "approximate ? 0.7 : 1" }
          }
        }
      }
    ],

    config: { axisY: { minExtent: AXIS_Y_EXTENT } }
  };

  const runtime = parse(vgSpec);

  const vgView = new View(runtime).initialize(el).renderer("svg");

  vgView["_spec"] = vgSpec;
  return vgView;
}
