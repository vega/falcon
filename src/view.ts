import { parse, Spec, View, Warn } from "vega-lib";

export const HISTOGRAM_WIDTH = 600;
export const HEATMAP_WIDTH = 450;

export function createHistogramView<D extends string>(
  el: Element,
  view: View1D<D>
): View {
  const dimension = view.dimension;

  const vgSpec: Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    autosize: "none",
    padding: { top: 5, left: 70, right: 60, bottom: 90 },
    width: HISTOGRAM_WIDTH,
    height: HISTOGRAM_WIDTH / 3.5,
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
      },
      {
        name: "interesting"
      }
    ],
    signals: [
      { name: "active", update: false },
      { name: "bin", update: JSON.stringify(dimension.binConfig) },
      {
        name: "brush",
        value: 0,
        on: [
          {
            events: { signal: "zoom" },
            update:
              "clampRange(zoomLinear(brush, down, zoom), bin.start, bin.stop)"
          },
          {
            events: "@chart:dblclick!, @brush:dblclick!",
            update: "0"
          },
          {
            events: { signal: "pan" },
            update:
              "clampRange(panLinear(anchor, pan / span(anchor)), bin.start, bin.stop)"
          },
          {
            events: "[@chart:mousedown, window:mouseup] > window:mousemove!",
            update: '[down, clamp(invert("x", x()), bin.start, bin.stop)]'
          },
          {
            events:
              "[@left:mousedown, window:mouseup] > window:mousemove!, [@left_grabber:mousedown, window:mouseup] > window:mousemove!",
            update: '[clamp(invert("x", x()), bin.start, bin.stop), brush[1]]'
          },
          {
            events:
              "[@right:mousedown, window:mouseup] > window:mousemove!, [@right_grabber:mousedown, window:mouseup] > window:mousemove!",
            update: '[brush[0], clamp(invert("x", x()), bin.start, bin.stop)]'
          }
        ]
      },
      {
        name: "down", // in data space
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
            update: 'down - invert("x", x())'
          }
        ]
      },
      {
        name: "pixelBrush",
        value: [-10, -10],
        on: [
          {
            events: { signal: "brush" },
            update:
              'span(brush) ? [scale("x", brush[0]), scale("x", brush[1])] : [-10, -10]'
          }
        ]
      }
    ],
    layout: {
      padding: { row: 10, column: 10 },
      offset: 10,
      columns: 1,
      bounds: "full",
      align: "each"
    },
    marks: [
      {
        type: "group",
        marks: [
          {
            type: "text",
            from: { data: "sum" },
            encode: {
              update: {
                x: { signal: "width", offset: 5 },
                y: { value: 30 },
                text: { field: "sum" }
              }
            }
          },
          {
            type: "symbol",
            encode: {
              enter: {
                shape: { value: "circle" },
                stroke: { value: "black" }
              },
              update: {
                fill: { signal: 'active ? "black" : "transparent"' },
                x: { signal: "width", offset: 10 },
                y: { value: 10 },
                tooltip: { signal: '"Currently active: " + active' }
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
                    x: { signal: "pixelBrush[0]" },
                    x2: { signal: "pixelBrush[1]" }
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
                    x: { signal: "pixelBrush[0]" }
                  }
                },
                marks: [
                  {
                    type: "path",
                    name: "left_grabber",
                    encode: {
                      enter: {
                        y: {
                          field: { group: "height" },
                          mult: 0.5,
                          offset: -50
                        },
                        fill: { value: "#eee" },
                        stroke: { value: "#666" },
                        cursor: { value: "ew-resize" }
                      },
                      update: {
                        path: {
                          signal:
                            "pixelBrush[0] <= pixelBrush[1] ? 'M-0.5,33.333333333333336A6,6 0 0 0 -6.5,39.333333333333336V60.66666666666667A6,6 0 0 0 -0.5,66.66666666666667ZM-2.5,41.333333333333336V58.66666666666667M-4.5,41.333333333333336V58.66666666666667' : 'M0.5,33.333333333333336A6,6 0 0 1 6.5,39.333333333333336V60.66666666666667A6,6 0 0 1 0.5,66.66666666666667ZM2.5,41.333333333333336V58.66666666666667M4.5,41.333333333333336V58.66666666666667'"
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
                    x: { signal: "pixelBrush[1]" }
                  }
                },
                marks: [
                  {
                    type: "path",
                    name: "right_grabber",
                    encode: {
                      enter: {
                        y: {
                          field: { group: "height" },
                          mult: 0.5,
                          offset: -50
                        },
                        fill: { value: "#eee" },
                        stroke: { value: "#666" },
                        cursor: { value: "ew-resize" }
                      },
                      update: {
                        path: {
                          signal:
                            "pixelBrush[0] >= pixelBrush[1] ? 'M-0.5,33.333333333333336A6,6 0 0 0 -6.5,39.333333333333336V60.66666666666667A6,6 0 0 0 -0.5,66.66666666666667ZM-2.5,41.333333333333336V58.66666666666667M-4.5,41.333333333333336V58.66666666666667' : 'M0.5,33.333333333333336A6,6 0 0 1 6.5,39.333333333333336V60.66666666666667A6,6 0 0 1 0.5,66.66666666666667ZM2.5,41.333333333333336V58.66666666666667M4.5,41.333333333333336V58.66666666666667'"
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
        ]
      },
      {
        type: "group",
        marks: [
          {
            type: "rect",
            from: { data: "interesting" },
            encode: {
              enter: {
                x: { field: "x" },
                width: { value: 1 },
                y: { value: 30 },
                height: { value: 10 }
              },
              update: {
                fill: { field: "value", scale: "color" }
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
          signal: "sequence(bin.start, bin.stop + bin.step, bin.step)"
        },
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: { data: "table", field: "value" },
        range: "height",
        nice: true,
        zero: true
      },
      {
        name: "color",
        type: "sequential",
        range: { scheme: "inferno" },
        domain: { data: "interesting", field: "value" }
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
  const [dimensionX, dimensionY] = view.dimensions;

  console.log(dimensionY);

  const vgSpec: Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    autosize: "none",
    padding: { top: 5, left: 70, right: 70, bottom: 40 },
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
                  signal: `datum.keyX + ${dimensionX.binConfig!.step}`
                },
                y: { scale: "y", field: "keyY" },
                y2: {
                  scale: "y",
                  signal: `datum.keyY + ${dimensionY.binConfig!.step}`
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
        title: dimensionX.name,
        zindex: 1
      },
      {
        scale: "y",
        orient: "left",
        labelOverlap: true,
        tickCount: { signal: "ceil(width/20)" },
        title: dimensionY.name,
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
    config: { axisY: { minExtent: 50 } }
  };

  const runtime = parse(vgSpec);

  return new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer("canvas");
}
