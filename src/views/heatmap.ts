import { parse, Spec, View, Mark, Warn } from "vega-lib";
import { View2D } from "../api";
import { Config } from "../config";
import { darkerBlue, loadingMarks } from "./histogram";

export function createHeatmapView<D extends string>(
  el: Element,
  view: View2D<D>,
  config: Config
): View {
  const [dimensionX, dimensionY] = view.dimensions;

  const [width, height] = view.chartSize || [
    config.heatmapWidth,
    config.heatmapHeight || config.heatmapWidth
  ];

  const marks: Mark[] = [
    {
      type: "text",
      name: "reset",
      encode: {
        enter: {
          x: { signal: "width", mult: 0.5, offset: 5 },
          y: { value: -10 },
          align: { value: "left" },
          cursor: { value: "pointer" },
          fontWeight: { value: "bold" },
          fill: { value: "black" }
        },
        update: {
          text: { signal: "span(brushX) && span(brushY) ? 'Reset Brush' : ''" }
        }
      }
    },
    {
      type: "text",
      encode: {
        enter: {
          x: { signal: "width", mult: 0.5, offset: -5 },
          y: { value: -10 },
          align: { value: "right" },
          fill: { value: "#666" }
        },
        update: {
          text: {
            signal: `dataBrush ? 'X: [' + ${
              dimensionX.time ? "timeFormat" : "format"
            }(dataBrush[0][0], '${dimensionX.format}') + ',' + ${
              dimensionX.time ? "timeFormat" : "format"
            }(dataBrush[0][1], '${dimensionX.format}') + '] Y: [' + ${
              dimensionY.time ? "timeFormat" : "format"
            }(dataBrush[1][0], '${dimensionY.format}') + ',' + ${
              dimensionY.time ? "timeFormat" : "format"
            }(dataBrush[1][1], '${dimensionY.format}') + ']' : ''`
          }
        }
      }
    }
  ];

  if (config.circleHeatmap && config.toggleUnfiltered) {
    marks.push({
      type: "text",
      name: "toggleShowBase",
      encode: {
        enter: {
          x: { signal: "width" },
          y: { value: -10 },
          align: { value: "right" },
          cursor: { value: "pointer" },
          fontWeight: { value: "bold" },
          fill: { value: "black" }
        },
        update: {
          text: { signal: "showBase ? 'Hide Unfiltered' : 'Show Unfiltered'" }
        }
      }
    } as Mark);
  }

  let dataMarks: Mark[];

  if (config.circleHeatmap) {
    dataMarks = [
      {
        type: "symbol",
        from: { data: "base" },
        interactive: false,
        encode: {
          enter: {
            shape: { value: "circle" },
            fill: { value: "#000" },
            opacity: { value: 0.07 }
          },
          update: {
            x: {
              scale: "x",
              signal: `datum.keyX + binX.step/2`
            },
            y: {
              scale: "y",
              signal: `datum.keyY + binY.step/2`
            },
            size: {
              scale: "size",
              field: "value"
            }
          }
        }
      },
      {
        type: "symbol",
        from: { data: "table" },
        interactive: false,
        encode: {
          enter: {
            shape: { value: "circle" },
            fill: { value: darkerBlue }
          },
          update: {
            x: {
              scale: "x",
              signal: `datum.keyX + binX.step/2`
            },
            y: {
              scale: "y",
              signal: `datum.keyY + binY.step/2`
            },
            size: {
              scale: "size",
              field: "value"
            },
            opacity: { signal: "approximate ? 0.7 : 1" }
          }
        }
      }
    ];
  } else {
    dataMarks = [
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
      }
    ];
  }

  marks.push({
    type: "group",
    name: "chart",
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
    marks: dataMarks.concat([
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
    ])
  });

  marks.push(...loadingMarks("height"));

  const vgSpec: Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    width: width,
    height: height,
    padding: 5,
    data: [
      {
        // base = unfiltered data
        name: "base",
        transform: [
          {
            type: "filter",
            expr: "showBase"
          }
        ]
      },
      {
        name: "table"
      }
    ],
    signals: [
      { name: "pending", value: false },
      { name: "approximate", value: false },
      { name: "binX", value: dimensionX.binConfig },
      { name: "binY", value: dimensionY.binConfig },
      { name: "pixels", value: [1, 1] },
      {
        name: "resolution",
        update: "[width / pixels[0], height / pixels[1]]"
      },
      {
        name: "showBase",
        value: config.showUnfiltered,
        on: [
          {
            events: "@toggleShowBase:click!, @toggleShowBase:touchstart!",
            update: "!showBase"
          }
        ]
      },
      {
        name: "brushX",
        value: 0,
        on: [
          {
            events:
              "@chart:dblclick!, @brush:dblclick!, @reset:click!, @reset:touchstart!",
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
            update:
              "[clamp(snappedX, 0, width), round(brushX[1] / resolution[0]) * resolution[0]]"
          },
          {
            events: "[@right:mousedown, window:mouseup] > window:mousemove!",
            update:
              "[round(brushX[0] / resolution[0]) * resolution[0], clamp(snappedX, 0, width)]"
          }
        ]
      },
      {
        name: "brushY",
        value: 0,
        on: [
          {
            events: "@chart:dblclick!, @brush:dblclick!, @reset:click!",
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
            update:
              "[round(brushY[0] / resolution[1]) * resolution[1], clamp(snappedY, 0, height)]"
          },
          {
            events: "[@bottom:mousedown, window:mouseup] > window:mousemove!",
            update:
              "[clamp(snappedY, 0, height), round(brushY[1] / resolution[1]) * resolution[1]]"
          }
        ]
      },
      {
        name: "snappedX",
        value: 0,
        on: [
          {
            events: "window:mousemove",
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
            events: "window:mousemove",
            update: config.interpolate
              ? "y()"
              : "round(y() / resolution[1]) * resolution[1]"
          }
        ]
      },
      {
        name: "down",
        value: [0, 0],
        on: [
          {
            events: "@chart:mousedown, @brush:mousedown",
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
            update:
              "[[round(brushX[0] / resolution[0]) * resolution[0], round(brushX[1] / resolution[0]) * resolution[0]]," +
              "[round(brushY[0] / resolution[1]) * resolution[1], round(brushY[1] / resolution[1]) * resolution[1]]]"
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
        update: `span(brushX) && span(brushY) ? [${
          dimensionX.time
            ? "[time(invert('x', brushX[0])), time(invert('x', brushX[1]))]"
            : "invert('x', brushX)"
        }, ${
          dimensionY.time
            ? "[time(invert('y', brushY[0])), time(invert('y', brushY[1]))]"
            : "invert('y', brushY)"
        }] : 0`
      },
      {
        name: "binBrush",
        update:
          "span(brushX) && span(brushY) ? [[brushX[0] / resolution[0], brushX[1] / resolution[0]]," +
          "[pixels[1] - brushY[0] / resolution[1], pixels[1] - brushY[1] / resolution[1]]] : 0"
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
      config.circleHeatmap
        ? {
            name: "size",
            type: "linear",
            range: [0, config.maxCircleSize],
            domain: {
              fields: [
                { data: "base", field: "value" },
                { data: "table", field: "value" }
              ]
            },
            nice: true
          }
        : {
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
        tickCount: { signal: "ceil(height/20)" },
        title: dimensionY.title || dimensionY.name,
        zindex: 1
      }
    ],
    legends: [
      {
        title: "Count",
        orient: "none",

        ...(config.circleHeatmap
          ? {
              size: "size",
              symbolFillColor: darkerBlue,
              symbolStrokeWidth: 0
            }
          : {
              fill: "color",
              type: "gradient",
              gradientLength: { signal: "height - 16" }
            }),
        encode: {
          legend: {
            enter: {
              x: { signal: "width + 20" }
            }
          }
        }
      }
    ],
    config: { axisY: { minExtent: config.yAxisExtent } }
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
