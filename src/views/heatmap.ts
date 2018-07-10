import { parse, Spec, View, Warn } from "vega-lib";
import { AXIS_Y_EXTENT } from "../config";

export const HEATMAP_WIDTH = 450;

export function createHeatmapView<D extends string>(
  el: Element,
  view: View2D<D>
): View {
  const [dimensionX, dimensionY] = view.dimensions;

  const vgSpec: Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    width: HEATMAP_WIDTH,
    height: HEATMAP_WIDTH,
    data: [
      {
        name: "table"
      }
    ],
    signals: [
      { name: "binX", update: JSON.stringify(dimensionX.binConfig) },
      { name: "binY", update: JSON.stringify(dimensionY.binConfig) },
      { name: "extentX", value: dimensionX.extent },
      { name: "extentY", value: dimensionY.extent },
      {
        name: "brushX",
        value: 0,
        on: [
          {
            events: "@chart:dblclick!, @brush:dblclick!",
            update: "0"
          },
          {
            events: { signal: "pan" },
            update:
              "clampRange(panLinear(anchor[0], pan[0] / span(anchor[0])), binX.start, binX.stop)"
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove!",
            update: '[down[0], clamp(invert("x", x()), binX.start, binX.stop)]'
          },
          {
            events: "[@left:mousedown, window:mouseup] > window:mousemove!",
            update:
              '[clamp(invert("x", x()), binX.start, binX.stop), brushX[1]]'
          },
          {
            events: "[@right:mousedown, window:mouseup] > window:mousemove!",
            update:
              '[brushX[0], clamp(invert("x", x()), binX.start, binX.stop)]'
          }
        ]
      },
      {
        name: "brushY",
        value: 0,
        on: [
          {
            events: "@chart:dblclick!, @brush:dblclick!",
            update: "0"
          },
          {
            events: { signal: "pan" },
            update:
              "clampRange(panLinear(anchor[1], pan[1] / span(anchor[1])), binY.start, binY.stop)"
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove!",
            update: '[down[1], clamp(invert("y", y()), binY.start, binY.stop)]'
          },
          {
            events: "[@top:mousedown, window:mouseup] > window:mousemove!",
            update:
              '[brushY[0], clamp(invert("y", y()), binY.start, binY.stop)]'
          },
          {
            events: "[@bottom:mousedown, window:mouseup] > window:mousemove!",
            update:
              '[clamp(invert("y", y()), binY.start, binY.stop), brushY[1]]'
          }
        ]
      },
      {
        name: "down",
        value: [0, 0],
        on: [
          {
            events: "mousedown!",
            update: '[invert("x", x()), invert("y", y())]'
          }
        ]
      },
      {
        name: "anchor", // in data space
        value: [0, 0],
        on: [
          {
            events: "@brush:mousedown!",
            update: "[slice(brushX), slice(brushY)]"
          }
        ]
      },
      {
        name: "pan", // in data space
        value: [0, 0],
        on: [
          {
            events: "[@brush:mousedown, window:mouseup] > window:mousemove!",
            update: '[down[0] - invert("x", x()), down[1] - invert("y", y())]'
          }
        ]
      },
      {
        name: "pixelBrushX", // in pixel space
        value: [-10, -10],
        on: [
          {
            events: { signal: "brushX" },
            update:
              'span(brushX) ? [scale("x", brushX[0]), scale("x", brushX[1])] : [-10, -10]'
          }
        ]
      },
      {
        name: "pixelBrushY", // in pixel space
        value: [-10, -10],
        on: [
          {
            events: { signal: "brushY" },
            update:
              'span(brushY) ? [scale("y", brushY[0]), scale("y", brushY[1])] : [-10, -10]'
          }
        ]
      }
    ],
    marks: [
      {
        type: "group",
        name: "chart",
        encode: {
          enter: {
            height: { signal: "height" },
            width: { signal: "width" },
            clip: { value: true },
            fill: { value: "transparent" },
            cursor: { value: "crosshair" }
          }
        },
        marks: [
          {
            type: "rect",
            from: { data: "table" },
            interactive: false,
            encode: {
              update: {
                x: { scale: "x", field: "keyX" },
                x2: {
                  scale: "x",
                  signal: `datum.keyX + binX.step`
                },
                y: { scale: "y", field: "keyY" },
                y2: {
                  scale: "y",
                  signal: `datum.keyY + binY.step`
                },
                fill: { scale: "color", field: "value" }
              }
            }
          },
          {
            type: "rect",
            name: "brush",
            encode: {
              enter: {
                y: { value: 0 },
                height: { field: { group: "height" } },
                fill: { value: "rgba(0,0,0,0.05)" },
                stroke: { value: "firebrick" },
                opacity: { value: 1 },
                cursor: { value: "move" }
              },
              update: {
                x: { signal: "pixelBrushX[0]" },
                x2: { signal: "pixelBrushX[1]" },
                y: { signal: "pixelBrushY[0]" },
                y2: { signal: "pixelBrushY[1]" }
              }
            }
          },
          {
            type: "rect",
            name: "left",
            encode: {
              enter: {
                fill: { value: "transparent" },
                cursor: { value: "ew-resize" }
              },
              update: {
                x: { signal: "pixelBrushX[0]", offset: -3 },
                x2: { signal: "pixelBrushX[0]", offset: 3 },
                y: { signal: "pixelBrushY[0]" },
                y2: { signal: "pixelBrushY[1]" }
              }
            }
          },
          {
            type: "rect",
            name: "right",
            encode: {
              enter: {
                fill: { value: "transparent" },
                cursor: { value: "ew-resize" }
              },
              update: {
                x: { signal: "pixelBrushX[1]", offset: -3 },
                x2: { signal: "pixelBrushX[1]", offset: 3 },
                y: { signal: "pixelBrushY[0]" },
                y2: { signal: "pixelBrushY[1]" }
              }
            }
          },
          {
            type: "rect",
            name: "bottom",
            encode: {
              enter: {
                fill: { value: "transparent" },
                cursor: { value: "ns-resize" }
              },
              update: {
                x: { signal: "pixelBrushX[0]" },
                x2: { signal: "pixelBrushX[1]" },
                y: { signal: "pixelBrushY[0]", offset: -3 },
                y2: { signal: "pixelBrushY[0]", offset: 3 }
              }
            }
          },
          {
            type: "rect",
            name: "top",
            encode: {
              enter: {
                fill: { value: "transparent" },
                cursor: { value: "ns-resize" }
              },
              update: {
                x: { signal: "pixelBrushX[0]" },
                x2: { signal: "pixelBrushX[1]" },
                y: { signal: "pixelBrushY[1]", offset: -3 },
                y2: { signal: "pixelBrushY[1]", offset: 3 }
              }
            }
          }
        ]
      }
    ],
    scales: [
      {
        name: "x",
        type: "bin-linear",
        domain: {
          signal: "sequence(binX.start, binX.stop + binX.step, binX.step)"
        },
        range: "width"
      },
      {
        name: "y",
        type: "bin-linear",
        domain: {
          signal: "sequence(binY.start, binY.stop + binY.step, binY.step)"
        },
        range: "height",
        reverse: true
      },
      {
        name: "color",
        type: "sequential",
        range: { scheme: "greenblue" },
        domain: { data: "table", field: "value" },
        nice: true
      }
    ],
    axes: [
      {
        scale: "x",
        orient: "bottom",
        labelOverlap: true,
        tickCount: { signal: "ceil(width/20)" },
        title: dimensionX.title || dimensionX.name,
        zindex: 1
      },
      {
        scale: "y",
        orient: "left",
        labelOverlap: true,
        tickCount: { signal: "ceil(width/20)" },
        title: dimensionY.title || dimensionY.name,
        zindex: 1
      }
    ],
    legends: [
      {
        fill: "color",
        type: "gradient",
        title: "Count",
        gradientLength: { signal: "height - 16" }
      }
    ],
    config: { axisY: { minExtent: AXIS_Y_EXTENT } }
  };

  const runtime = parse(vgSpec);

  const vgView = new View(runtime).initialize(el).renderer("canvas");

  vgView["_spec"] = vgSpec;
  return vgView;
}
