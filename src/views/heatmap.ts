import { parse, Spec, View, Mark, Warn } from "vega-lib";
import { View2D } from "../api";
import { AXIS_Y_EXTENT } from "./bar";
import { Config } from "../config";

export const HEATMAP_WIDTH = 450;

export function createHeatmapView<D extends string>(
  el: Element,
  view: View2D<D>,
  config: Config
): View {
  const [dimensionX, dimensionY] = view.dimensions;

  // TODO: support 2D interpolation
  const interpolate = false;

  const marks: Mark[] = [];

  if (config.readyIndicator) {
    marks.push({
      type: "symbol",
      encode: {
        enter: {
          shape: { value: "circle" },
          stroke: { value: "black" }
        },
        update: {
          fill: {
            signal: 'ready ? "black" : "transparent"'
          },
          x: { signal: "width", offset: 80 },
          y: { value: 10 },
          tooltip: {
            signal: '"View ready: " + ready'
          }
        }
      }
    } as Mark);
  }

  marks.push({
    type: "group",
    name: "chart",
    interactive: { signal: "ready" },
    encode: {
      enter: {
        height: { signal: "height" },
        width: { signal: "width" },
        fill: { value: "transparent" },
        cursor: { value: "crosshair" }
      },
      update: {
        clip: { signal: "!(span(brushX) && span(brushY))" }
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
            fill: {
              signal:
                "datum.value === 0 ? 'white' : scale('color', datum.value)"
            }
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
  });

  const vgSpec: Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    width: HEATMAP_WIDTH,
    height: HEATMAP_WIDTH,
    padding: 5,
    data: [
      {
        name: "table"
      }
    ],
    signals: [
      { name: "ready", value: false },
      { name: "binX", value: dimensionX.binConfig },
      { name: "binY", value: dimensionY.binConfig },
      { name: "pixels", value: [1, 1] },
      {
        name: "resolution",
        value: [1, 1],
        on: [
          {
            events: { signal: "pixels" },
            update: "[width / pixels[0], height / pixels[1]]"
          }
        ]
      },
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
              "clampRange(panLinear(anchor[0], pan[0] / span(anchor[0])), 0, width)"
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove!",
            update: "[down[0], clamp(snappedX, 0, width)]"
          },
          {
            events: "[@left:mousedown, window:mouseup] > window:mousemove!",
            update: "[clamp(snappedX, 0, width), brushX[1]]"
          },
          {
            events: "[@right:mousedown, window:mouseup] > window:mousemove!",
            update: "[brushX[0], clamp(snappedX, 0, width)]"
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
              "clampRange(panLinear(anchor[1], pan[1] / span(anchor[1])), 0, height)"
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove!",
            update: "[down[1], clamp(snappedY, 0, height)]"
          },
          {
            events: "[@top:mousedown, window:mouseup] > window:mousemove!",
            update: "[brushY[0], clamp(snappedY, 0, height)]"
          },
          {
            events: "[@bottom:mousedown, window:mouseup] > window:mousemove!",
            update: "[clamp(snappedY, 0, height), brushY[1]]"
          }
        ]
      },
      {
        name: "snappedX",
        value: 0,
        on: [
          {
            events: "mousemove",
            update: config.interpolate
              ? "x()"
              : "round(x() / resolution[0]) * resolution[0]"
          }
        ]
      },
      {
        name: "snappedY",
        value: 0,
        on: [
          {
            events: "mousemove",
            update: config.interpolate
              ? "x()"
              : "round(y() / resolution[1]) * resolution[1]"
          }
        ]
      },
      {
        name: "down",
        value: [0, 0],
        on: [
          {
            events: "mousedown",
            update: "[snappedX, snappedY]"
          }
        ]
      },
      {
        name: "anchor",
        value: [0, 0],
        on: [
          {
            events: "@brush:mousedown",
            update: "[slice(brushX), slice(brushY)]"
          }
        ]
      },
      {
        name: "pan",
        value: [0, 0],
        on: [
          {
            events: "[@brush:mousedown, window:mouseup] > window:mousemove!",
            update: "[down[0] - snappedX, down[1] - snappedY]"
          }
        ]
      },
      {
        name: "pixelBrushX",
        value: [-10, -10],
        on: [
          {
            events: { signal: "brushX" },
            update: "brushX ? brushX : [-10, -10]"
          },
          {
            events: "window:mouseup",
            update: "span(brushX) ? brushX : [-10, -10]"
          }
        ]
      },
      {
        name: "pixelBrushY",
        value: [-10, -10],
        on: [
          {
            events: { signal: "brushY" },
            update: "brushY ? brushY : [-10, -10]"
          },
          {
            events: "window:mouseup",
            update: "span(brushY) ? brushY : [-10, -10]"
          }
        ]
      },
      {
        name: "dataBrush",
        value: 0,
        on: [
          {
            events: [{ signal: "brushX" }, { signal: "brushY" }],
            update:
              "span(brushX) && span(brushY) ? [invert('x', brushX), invert('y', brushY)] : 0"
          }
        ]
      },
      {
        name: "binBrush",
        value: 0,
        on: [
          {
            events: [{ signal: "brushX" }, { signal: "brushY" }],
            update:
              "[[brushX[0] / resolution[0], brushX[1] / resolution[0]]," +
              "[pixels[1] - brushY[0] / resolution[1], pixels[1] - brushY[1] / resolution[1]]]"
          }
        ]
      },
      // set the cursor when the mouse is moving
      {
        name: "cursor",
        value: "default",
        on: [
          {
            events: { signal: "pan" },
            update: "'move'"
          },
          {
            events:
              "[@left:mousedown, window:mouseup] > window:mousemove, [@right:mousedown, window:mouseup] > window:mousemove",
            update: "'ew-resize'"
          },
          {
            events:
              "[@top:mousedown, window:mouseup] > window:mousemove, [@bottom:mousedown, window:mouseup] > window:mousemove",
            update: "'ns-resize'"
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove!",
            update: "'crosshair'"
          },
          {
            events: "window:mouseup",
            update: "'default'"
          }
        ]
      }
    ],
    marks: marks,
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
        gradientLength: { signal: "height - 16" },
        orient: "none",
        encode: {
          legend: {
            enter: {
              x: { signal: "width + 20" }
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
    .renderer("canvas");

  vgView["_spec"] = vgSpec;
  return vgView;
}
