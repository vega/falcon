import { parse, Spec, View, Warn } from "vega-lib";

export const CHART_WIDTH = 600;

export function createHistogramView<D extends string>(
  el: Element,
  view: View1D<D>
): View {
  const dimension = view.dimension;

  const vgSpec: Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    autosize: "none",
    padding: { top: 5, left: 70, right: 60, bottom: 40 },
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
      { name: "bin", update: JSON.stringify(dimension.binConfig) },
      {
        name: "brush",
        value: 0,
        on: [
          {
            events: { signal: "zoom" },
            update:
              "clampRange(zoomLinear(brush, xdown, zoom), bin.start, bin.stop)"
          },
          {
            events: "@chart:dblclick!, @brush:dblclick!",
            update: "0"
          },
          {
            events: { signal: "pan" },
            update: "panLinear(anchor, pan / span(anchor))"
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove!",
            update: '[xdown, invert("x", x())]'
          },
          {
            events:
              "[@left:mousedown, window:mouseup] > window:mousemove!, [@left_grabber:mousedown, window:mouseup] > window:mousemove!",
            update: '[invert("x", x()), brush[1]]'
          },
          {
            events:
              "[@right:mousedown, window:mouseup] > window:mousemove!, [@right_grabber:mousedown, window:mouseup] > window:mousemove!",
            update: '[brush[0], invert("x", x())]'
          }
        ]
      },
      {
        name: "xdown", // in data space
        value: 0,
        on: [
          {
            events: "mousedown!, wheel!",
            update: 'invert("x", x())'
          }
        ]
      },
      {
        name: "anchor", // in data space
        value: 0,
        on: [
          {
            events: "@brush:mousedown!",
            update: "slice(brush)" // copy the brush
          }
        ]
      },
      {
        name: "zoom", // in pixel space
        value: 0,
        on: [
          {
            events: "@brush:wheel!",
            update: "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
          }
        ]
      },
      {
        name: "pan", // in data space
        value: 0,
        on: [
          {
            events: "[@brush:mousedown, window:mouseup] > window:mousemove!",
            update: 'xdown - invert("x", x())'
          }
        ]
      },
      {
        name: "range",
        update: "brush",
        on: [
          {
            events: { signal: "brush" },
            update:
              "span(brush) ? (brush[0] < brush[1] ? brush : [brush[1], brush[0]]) : 0"
          }
        ]
      },
      {
        name: "pixelRange",
        value: [-10, -10],
        on: [
          {
            events: { signal: "range" },
            update:
              'span(brush) ? [scale("x", range[0]), scale("x", range[1])] : [-10, -10]'
          }
        ]
      }
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
                x: { signal: "pixelRange[0]" },
                x2: { signal: "pixelRange[1]" }
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
                  signal: `datum.key + bin.step`
                },
                y: { scale: "y", field: "value" },
                y2: { scale: "y", value: 0 },
                fill: { value: "#4c78a8" } // darker blue
              }
            }
          },
          {
            type: "group",
            encode: {
              enter: {
                height: { signal: "height" }
              },
              update: {
                x: { signal: "pixelRange[0]" }
              }
            },
            marks: [
              {
                type: "path",
                name: "left_grabber",
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
                  }
                }
              },
              {
                type: "rect",
                encode: {
                  enter: {
                    y: { value: 0 },
                    height: { field: { group: "height" } },
                    fill: { value: "firebrick" },
                    x: { value: -1 },
                    width: { value: 1 }
                  }
                }
              },
              {
                type: "rect",
                name: "left",
                encode: {
                  enter: {
                    y: { value: 0 },
                    height: { field: { group: "height" } },
                    fill: { value: "transparent" },
                    width: { value: 7 },
                    cursor: { value: "ew-resize" },
                    x: { value: -3 }
                  }
                }
              }
            ]
          },
          {
            type: "group",
            encode: {
              enter: {
                height: { signal: "height" }
              },
              update: {
                x: { signal: "pixelRange[1]" }
              }
            },
            marks: [
              {
                type: "path",
                name: "right_grabber",
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
                  }
                }
              },
              {
                type: "rect",
                encode: {
                  enter: {
                    y: { value: 0 },
                    height: { field: { group: "height" } },
                    fill: { value: "firebrick" },
                    width: { value: 1 }
                  }
                }
              },
              {
                type: "rect",
                name: "right",
                encode: {
                  enter: {
                    y: { value: 0 },
                    height: { field: { group: "height" } },
                    fill: { value: "transparent" },
                    width: { value: 7 },
                    cursor: { value: "ew-resize" },
                    x: { value: -3 }
                  }
                }
              }
            ]
          }
        ]
      }
    ],
    scales: [
      {
        name: "x",
        type: "bin-linear",
        domain: { signal: "sequence(bin.start, bin.stop, bin.step)" },
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
        title: dimension.name
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
    config: { axisY: { minExtent: 50 } }
  };

  const runtime = parse(vgSpec);

  return new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer("svg");
}

export function createHeatmapView<D extends string>(
  el: Element,
  view: View2D<D>
): View {
  const [xDimension, yDimension] = view.dimensions;

  const vgSpec: Spec = {
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
      { name: "extentX", value: xDimension.extent },
      { name: "extentY", value: yDimension.extent },
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
                x: { scale: "x", field: "keyX" },
                x2: {
                  scale: "x",
                  signal: `datum.keyX + ${xDimension.binConfig!.step}`
                },
                y: { scale: "y", field: "keyY" },
                y2: {
                  scale: "y",
                  signal: `datum.keyY + ${yDimension.binConfig!.step}`
                }
              },
              update: {
                fill: { scale: "color", field: "value" },
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
        domain: xDimension.extent,
        range: "width",
        zero: false
      },
      {
        name: "y",
        type: "linear",
        domain: yDimension.extent,
        range: "width",
        reverse: true,
        zero: false
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
        title: xDimension.name
      },
      {
        scale: "y",
        orient: "left",
        labelOverlap: true,
        tickCount: { signal: "ceil(width/20)" },
        title: yDimension.name
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

  const runtime = parse(vgSpec);

  return new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer("svg");
}
