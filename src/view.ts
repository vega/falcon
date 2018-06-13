import * as vega from "vega-lib";
import { range } from "d3";

export const CHART_WIDTH = 600;

export function createHistogramView(
  el: Element,
  dimension: string,
  binConfig: BinConfig
): vega.View {
  const vgSpec: vega.Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    autosize: "none",
    padding: { top: 5, left: 60, right: 60, bottom: 40 },
    width: CHART_WIDTH,
    height: 180,
    data: [
      {
        name: "table"
      },
      {
        name: "sum",
        source: "table",
        transform: [
          {
            type: "aggregate",
            ops: ["sum"],
            fields: ["value"],
            as: ["sum"]
          }
        ]
      }
    ],
    signals: [
      {
        name: "xmove",
        value: 0,
        on: [{ events: "window:mousemove", update: "x()" }]
      },
      { name: "extent", value: [binConfig.start, binConfig.stop] },
      {
        name: "range",
        update: "extent",
        on: [
          {
            events: { signal: "zoom" },
            update:
              "[clamp((range[0]+range[1])/2 - zoom, extent[0], extent[1]), clamp((range[0]+range[1])/2 + zoom, extent[0], extent[1])]"
          },
          {
            events: "@chart:dblclick!, @brush:dblclick!",
            update: "[extent[0], extent[1]]"
          },
          {
            events: "[@brush:mousedown, window:mouseup] > window:mousemove!",
            update:
              '[range[0] + invert("x", x()) - invert("x", xmove), range[1] + invert("x", x()) - invert("x", xmove)]'
          },
          {
            events:
              "[@brush_start:mousedown, window:mouseup] > window:mousemove!, [@brush_start_grabber:mousedown, window:mouseup] > window:mousemove!",
            update:
              '[range[0] + invert("x", x()) - invert("x", xmove), range[1]]'
          },
          {
            events:
              "[@brush_end:mousedown, window:mouseup] > window:mousemove!, [@brush_end_grabber:mousedown, window:mouseup] > window:mousemove!",
            update:
              '[range[0], range[1] + invert("x", x()) - invert("x", xmove)]'
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove!",
            update:
              '[min(anchor, invert("x", x())), max(anchor, invert("x", x()))]'
          }
        ]
      },
      {
        name: "zoom",
        value: 0,
        on: [
          {
            events: "@chart:wheel!, @brush:wheel!",
            update:
              "0.5 * abs(span(range)) * pow(1.0005, event.deltaY * pow(16, event.deltaMode))"
          }
        ]
      },
      {
        name: "anchor",
        value: 0,
        on: [
          {
            events: "@chart:mousedown!",
            update: 'invert("x", x())'
          }
        ]
      }
      // {
      //   name: "pixelRange",
      //   value: [0, { signal: "width" }],
      //   on: [
      //     {
      //       events: { signal: "range" },
      //       update:
      //         '[max(0, scale("x", range[0])), min(scale("x", range[1]), width - 1)]'
      //     }
      //   ]
      // }
    ],
    marks: [
      {
        type: "text",
        from: { data: "sum" },
        encode: {
          update: {
            x: { signal: "width", offset: 5 },
            y: { value: 10 },
            text: { field: "sum" }
          }
        }
      },
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
            name: "brush",
            encode: {
              enter: {
                y: { value: 0 },
                height: { field: { group: "height" } },
                fill: { value: "#000" },
                opacity: { value: 0.05 },
                cursor: { value: "move" }
              },
              update: {
                x: { signal: 'scale("x", range[0])' },
                x2: { signal: 'scale("x", range[1])' }
              }
            }
          },
          {
            name: "marks",
            type: "rect",
            interactive: false,
            from: { data: "table" },
            encode: {
              update: {
                x: {
                  scale: "x",
                  field: "key",
                  offset: 1
                },
                x2: {
                  scale: "x",
                  signal: `datum.key + ${binConfig.step}`
                },
                y: { scale: "y", field: "value" },
                y2: { scale: "y", value: 0 },
                fill: { value: "#4c78a8" } // darker blue
              }
            }
          },
          {
            type: "path",
            name: "brush_start_grabber",
            encode: {
              enter: {
                y: { field: { group: "height" }, mult: 0.5, offset: -50 },
                path: {
                  value:
                    "M-0.5,33.333333333333336A6,6 0 0 0 -6.5,39.333333333333336V60.66666666666667A6,6 0 0 0 -0.5,66.66666666666667ZM-2.5,41.333333333333336V58.66666666666667M-4.5,41.333333333333336V58.66666666666667"
                },
                fill: { value: "#eee" },
                stroke: { value: "#666" },
                cursor: { value: "ew-resize" }
              },
              update: {
                x: { signal: 'max(1, scale("x", range[0]))' }
              }
            }
          },
          {
            type: "path",
            name: "brush_end_grabber",
            encode: {
              enter: {
                y: { field: { group: "height" }, mult: 0.5, offset: -50 },
                path: {
                  value:
                    "M0.5,33.333333333333336A6,6 0 0 1 6.5,39.333333333333336V60.66666666666667A6,6 0 0 1 0.5,66.66666666666667ZM2.5,41.333333333333336V58.66666666666667M4.5,41.333333333333336V58.66666666666667"
                },
                fill: { value: "#eee" },
                stroke: { value: "#666" },
                cursor: { value: "ew-resize" }
              },
              update: {
                x: {
                  signal: 'min(width - 1, scale("x", range[1]))'
                }
              }
            }
          },
          {
            type: "rect",
            encode: {
              enter: {
                y: { value: 0 },
                height: { field: { group: "height" } },
                fill: { value: "firebrick" }
              },
              update: {
                x: { signal: 'max(1, scale("x", range[0]))', offset: -1 },
                width: { value: 1 }
              }
            }
          },
          {
            type: "rect",
            encode: {
              enter: {
                y: { value: 0 },
                height: { field: { group: "height" } },
                fill: { value: "firebrick" }
              },
              update: {
                x: { signal: 'min(width - 1, scale("x", range[1]))' },
                width: { value: 1 }
              }
            }
          },
          {
            type: "rect",
            name: "brush_start",
            encode: {
              enter: {
                y: { value: 0 },
                height: { field: { group: "height" } },
                fill: { value: "transparent" },
                width: { value: 7 },
                cursor: { value: "ew-resize" }
              },
              update: {
                x: { signal: 'max(1, scale("x", range[0]))', offset: -3 }
              }
            }
          },
          {
            type: "rect",
            name: "brush_end",
            encode: {
              enter: {
                y: { value: 0 },
                height: { field: { group: "height" } },
                fill: { value: "transparent" },
                width: { value: 7 },
                cursor: { value: "ew-resize" }
              },
              update: {
                x: {
                  signal: 'min(width - 1, scale("x", range[1]))',
                  offset: -3
                }
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
        domain: range(binConfig.start, binConfig.stop, binConfig.step),
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: { data: "table", field: "value" },
        range: "height",
        nice: true,
        zero: true
      }
    ],
    axes: [
      {
        scale: "x",
        orient: "bottom",
        labelOverlap: true,
        tickCount: { signal: "ceil(width/20)" },
        title: dimension
      },
      {
        scale: "y",
        orient: "left",
        labelOverlap: true,
        tickCount: { signal: "ceil(height/40)" },
        title: "Count",
        grid: true,
        encode: {
          grid: {
            update: {
              stroke: { value: "#ddd" }
            }
          }
        }
      }
    ],
    config: { axisY: { minExtent: 30 } }
  };

  const runtime = vega.parse(vgSpec);

  return new vega.View(runtime)
    .logLevel(vega.Warn)
    .initialize(el)
    .renderer("svg");
}

export function createHeatmapView(
  el: Element,
  dimensions: [string, string],
  step: [number, number],
  bins: [number[], number[]],
  domains: [[number, number], [number, number]]
): vega.View {
  const vgSpec: vega.Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    autosize: "none",
    padding: { top: 5, left: 60, right: 70, bottom: 40 },
    width: CHART_WIDTH,
    height: CHART_WIDTH,
    data: [
      {
        name: "table"
      }
    ],
    signals: [
      // {
      //   name: "brush",
      //   value: null,
      //   on: [
      //     {
      //       events: "@chart:mousedown",
      //       update: "[brushX, brushY]"
      //     },
      //     {
      //       events: "[@chart:mousedown, window:mouseup] > window:mousemove",
      //       update: "[brushX, brushY]"
      //     },
      //     {
      //       events: { signal: "delta" },
      //       update: "[brushX, brushY]"
      //     }
      //   ]
      // },
      { name: "extentX", value: domains[0] },
      { name: "extentY", value: domains[1] },
      {
        name: "rangeX",
        value: 0,
        on: [
          {
            events: { signal: "brushX" },
            update: "[invert('x', brushX[0]), invert('x', brushX[1])]"
          }
        ]
      },
      {
        name: "rangeY",
        value: 0,
        on: [
          {
            events: { signal: "brushY" },
            update: "[invert('y', brushY[0]), invert('y', brushY[1])]"
          }
        ]
      },
      {
        name: "brushX",
        value: 0,
        on: [
          {
            events: "@chart:mousedown",
            update: "[x(), x()]"
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove",
            update: "[brushX[0], clamp(x(), 0, width)]"
          },
          {
            events: { signal: "delta" },
            update:
              "clampRange([anchorX[0] + delta[0], anchorX[1] + delta[0]], 0, width)"
          },
          {
            events: "@chart:dblclick!, @brush:dblclick!",
            update: "0"
          }
        ]
      },
      {
        name: "brushY",
        value: 0,
        on: [
          {
            events: "@chart:mousedown",
            update: "[y(), y()]"
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove",
            update: "[brushY[0], clamp(y(), 0, height)]"
          },
          {
            events: { signal: "delta" },
            update:
              "clampRange([anchorY[0] + delta[1], anchorY[1] + delta[1]], 0, height)"
          },
          {
            events: "@chart:dblclick!, @brush:dblclick!",
            update: "0"
          }
        ]
      },
      {
        name: "down",
        value: [0, 0],
        on: [{ events: "@brush:mousedown", update: "[x(), y()]" }]
      },
      {
        name: "anchorX",
        value: null,
        on: [{ events: "@brush:mousedown", update: "slice(brushX)" }]
      },
      {
        name: "anchorY",
        value: null,
        on: [{ events: "@brush:mousedown", update: "slice(brushY)" }]
      },
      {
        name: "delta",
        value: [0, 0],
        on: [
          {
            events: "[@brush:mousedown, window:mouseup] > window:mousemove",
            update: "[x() - down[0], y() - down[1]]"
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
            encode: {
              enter: {
                x: { scale: "x", field: "binx" },
                x2: { scale: "x", signal: `datum.binx + ${step[0]}` },
                y: { scale: "y", field: "biny" },
                y2: { scale: "y", signal: `datum.biny + ${step[1]}` }
              },
              update: {
                fill: { scale: "color", field: "count" },
                tooltip: { signal: "datum" }
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
                x: { signal: "brushX[0]" },
                x2: { signal: "brushX[1]" },
                y: { signal: "brushY[0]" },
                y2: { signal: "brushY[1]" }
              }
            }
          }
        ]
      }
    ],
    scales: [
      {
        name: "x",
        type: "linear",
        domain: domains[0],
        range: "width",
        zero: false
      },
      {
        name: "y",
        type: "linear",
        domain: domains[1],
        range: "width",
        reverse: true,
        zero: false
      },
      {
        name: "color",
        type: "sequential",
        range: { scheme: "greenblue" },
        domain: { data: "table", field: "count" },
        nice: true
      }
    ],
    axes: [
      {
        scale: "x",
        orient: "bottom",
        labelOverlap: true,
        tickCount: { signal: "ceil(width/20)" },
        title: dimensions[0],
        values: bins[0]
      },
      {
        scale: "y",
        orient: "left",
        labelOverlap: true,
        tickCount: { signal: "ceil(width/20)" },
        title: dimensions[1],
        values: bins[1]
      }
    ],
    legends: [
      {
        fill: "color",
        type: "gradient",
        title: "Count",
        gradientLength: { signal: "height - 16" }
      }
    ]
  };

  const runtime = vega.parse(vgSpec);

  return new vega.View(runtime)
    .logLevel(vega.Warn)
    .initialize(el)
    .renderer("svg");
}
