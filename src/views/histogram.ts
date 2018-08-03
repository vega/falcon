import {
  Data,
  EncodeEntry,
  expressionFunction,
  Mark,
  OnEvent,
  parse,
  Scale,
  Signal,
  Spec,
  View,
  Warn
} from "vega-lib";
import { View1D } from "../api";
import { Config } from "../config";
import { extent, repeatInvisible } from "../util";
import { AXIS_Y_EXTENT } from "./bar";

export const darkerBlue = "#4c78a8";

export function createHistogramView<D extends string>(
  el: Element,
  view: View1D<D>,
  config: Config,
  logging: boolean
): View {
  const dimension = view.dimension;

  const data = [
    {
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
    },
    {
      name: "interesting"
    }
  ] as Data[];

  const barEncodeBase: EncodeEntry = {
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
    y2: { scale: "y", value: 0 }
  };

  const marks: Mark[] = [
    {
      type: "group",
      name: "main",
      encode: {
        enter: {
          height: { signal: "histHeight" },
          width: { signal: "width" }
        }
      },
      marks: [
        {
          type: "text",
          name: "reset",
          encode: {
            enter: {
              x: { signal: "width", mult: 0.5, offset: 5 },
              y: { value: -8 },
              align: { value: "left" },
              cursor: { value: "pointer" },
              fontWeight: { value: "bold" },
              fill: { value: "black" }
            },
            update: {
              text: { signal: "span(brush) ? 'Reset Brush' : ''" }
            }
          }
        },
        {
          type: "text",
          encode: {
            enter: {
              x: { signal: "width", mult: 0.5, offset: -5 },
              y: { value: -8 },
              align: { value: "right" },
              fill: { value: "#666" }
            },
            update: {
              text: {
                signal: `brush ? '[' + ${
                  dimension.time ? "timeFormat" : "format"
                }(brush[0], '${dimension.format}') + ',' + ${
                  dimension.time ? "timeFormat" : "format"
                }(brush[1], '${dimension.format}') + ']' : ''`
              }
            }
          }
        },
        {
          type: "group",
          name: "chart",
          interactive: { signal: "ready" },
          encode: {
            enter: {
              height: { field: { group: "height" } },
              width: { signal: "width" },
              fill: { value: "transparent" },
              cursor: { value: "crosshair" }
            },
            update: {
              // clip brush when it is inactive
              clip: { signal: "!span(brush)" }
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
                  x: { signal: "brush[0]", scale: "x" },
                  x2: { signal: "brush[1]", scale: "x" }
                }
              }
            },
            {
              type: "group",
              clip: true,
              marks: [
                {
                  type: "rect",
                  interactive: false,
                  from: { data: "base" },
                  encode: {
                    enter: {
                      fill: { value: "#000" },
                      opacity: { value: 0.07 },
                      key: { field: "key" }
                    },
                    update: {
                      ...barEncodeBase
                    }
                  }
                },
                {
                  type: "rect",
                  interactive: false,
                  from: { data: "table" },
                  encode: {
                    enter: {
                      fill: { value: darkerBlue }
                    },
                    update: {
                      ...barEncodeBase
                    }
                  }
                }
              ]
            },
            {
              type: "group",
              encode: {
                enter: {
                  height: { field: { group: "height" } }
                },
                update: {
                  x: { signal: "brush ? scale('x', brush[0]) : -10" }
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
                          "!reverseBrush ? 'M-0.5,33.333333333333336A6,6 0 0 0 -6.5,39.333333333333336V60.66666666666667A6,6 0 0 0 -0.5,66.66666666666667ZM-2.5,41.333333333333336V58.66666666666667M-4.5,41.333333333333336V58.66666666666667' : 'M0.5,33.333333333333336A6,6 0 0 1 6.5,39.333333333333336V60.66666666666667A6,6 0 0 1 0.5,66.66666666666667ZM2.5,41.333333333333336V58.66666666666667M4.5,41.333333333333336V58.66666666666667'"
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
                      x: { value: 0 },
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
                  height: { field: { group: "height" } }
                },
                update: {
                  x: { signal: "brush ? scale('x', brush[1]) : -10" }
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
                          "reverseBrush ? 'M-0.5,33.333333333333336A6,6 0 0 0 -6.5,39.333333333333336V60.66666666666667A6,6 0 0 0 -0.5,66.66666666666667ZM-2.5,41.333333333333336V58.66666666666667M-4.5,41.333333333333336V58.66666666666667' : 'M0.5,33.333333333333336A6,6 0 0 1 6.5,39.333333333333336V60.66666666666667A6,6 0 0 1 0.5,66.66666666666667ZM2.5,41.333333333333336V58.66666666666667M4.5,41.333333333333336V58.66666666666667'"
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
      ],

      axes: [
        {
          scale: "y",
          orient: "left",
          labelOverlap: true,
          tickCount: { signal: "ceil(histHeight/40)" },
          title: "Count",
          grid: true
        },
        {
          scale: "x",
          orient: "bottom",
          labelOverlap: true,
          ...(dimension.time
            ? {
                tickCount: dimension.bins
              }
            : {
                values: {
                  signal: "sequence(bin.start, bin.stop + bin.step, bin.step)"
                },
                tickCount: { signal: "ceil(width/20)" }
              })
        }
      ]
    }
  ];

  if (config.showInterestingness) {
    marks.push({
      type: "group",
      marks: [
        {
          type: "rect",
          from: { data: "interesting" },
          encode: {
            enter: {
              x: { field: "x", scale: "xPix" },
              width: { scale: "xPix", band: 1 },
              y: { field: "view", scale: "y" },
              height: { scale: "y", band: 1 },
              fill: { field: "value", scale: "color" }
            }
          }
        }
      ],
      scales: [
        {
          name: "xPix",
          type: "band",
          domain: { signal: "sequence(pixels)" },
          range: "width",
          padding: 0,
          round: false
        },
        {
          name: "y",
          type: "band",
          domain: { data: "interesting", field: "view" },
          range: { step: 10 },
          paddingInner: 0.1,
          paddingOuter: 0
        },
        {
          name: "color",
          type: "sequential",
          range: { scheme: "viridis" },
          domain: { data: "interesting", field: "value" }
        }
      ],
      axes: [
        {
          scale: "y",
          orient: "left",
          ticks: false,
          labelPadding: 5,
          labelLimit: 60,
          domain: false,
          labelFontSize: 8
        }
      ]
    } as Mark);
  }

  const onBrush: OnEvent[] = [
    {
      events: [{ signal: "step" }], // the right thing would be if bin or pixels changes but this works as well because bins align
      update:
        "span(brush) ? [floor(brush[0] / step) * step, floor(brush[1] / step) * step] : brush"
    },
    {
      events: "mouseup",
      update: "span(brush) ? brush : 0"
    },
    {
      events:
        "@chart:dblclick!, @brush:dblclick!, @left_grabber:dblclick!, @left:dblclick!, @right_grabber:dblclick!, @right:dblclick!, @reset:click!",
      update: "0"
    },
    {
      events: { signal: "pan" },
      update:
        "clampRange(panLinear(anchor, pan / span(anchor)), invert('x', 0), invert('x', width))"
    },
    {
      events: "[@chart:mousedown, window:mouseup] > window:mousemove!",
      update: "[down, clamp(snapped, invert('x', 0), invert('x', width))]"
    },
    {
      events:
        "[@left:mousedown, window:mouseup] > window:mousemove!, [@left_grabber:mousedown, window:mouseup] > window:mousemove!",
      update:
        "[clamp(snapped, invert('x', 0), invert('x', width)), scale('snap', brush[1])]"
    },
    {
      events:
        "[@right:mousedown, window:mouseup] > window:mousemove!, [@right_grabber:mousedown, window:mouseup] > window:mousemove!",
      update:
        "[scale('snap', brush[0]), clamp(snapped, invert('x', 0), invert('x', width))]"
    }
  ];

  const signals: Signal[] = [
    { name: "histHeight", value: Math.round(config.histogramWidth / 3.6) },
    { name: "ready", value: false },
    { name: "bin", value: dimension.binConfig },
    {
      name: "pixels",
      value: 1
    },
    {
      name: "step",
      update: "(bin.stop - bin.start) / pixels"
    },
    {
      name: "showBase",
      value: true,
      on: [{ events: "@toggleShowBase:click!", update: "!showBase" }]
    },
    {
      name: "brush",
      value: 0,
      on: onBrush
    },
    {
      name: "snapped",
      value: 0,
      on: [
        {
          events: "window:mousemove",
          update: config.interpolate
            ? "invert('x', x())"
            : "scale('snap', invert('x', x()))"
        }
      ]
    },
    {
      name: "down",
      value: 0,
      on: [
        {
          events: "mousedown",
          update: "snapped"
        }
      ]
    },
    {
      name: "anchor",
      value: 0,
      on: [
        {
          events: "@brush:mousedown",
          update: "[scale('snap', brush[0]), scale('snap', brush[1])]"
        }
      ]
    },
    {
      name: "pan",
      value: 0,
      on: [
        {
          events: "[@brush:mousedown, window:mouseup] > window:mousemove!",
          update: "down - snapped"
        }
      ]
    },
    {
      name: "reverseBrush",
      update: "brush[0] > brush[1]"
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
            "[@left:mousedown, window:mouseup] > window:mousemove, [@left_grabber:mousedown, window:mouseup] > window:mousemove, [@right:mousedown, window:mouseup] > window:mousemove, [@right_grabber:mousedown, window:mouseup] > window:mousemove",
          update: "'ew-resize'"
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
    },
    {
      name: "domain",
      value: [dimension.binConfig!.start, dimension.binConfig!.stop],
      on: config.zoom
        ? [
            {
              events: { signal: "zoom" },
              update:
                "keepWithin([zoomAnchor + (domain[0] - zoomAnchor) * zoom, zoomAnchor + (domain[1] - zoomAnchor) * zoom], brush)"
            }
          ]
        : []
    }
  ];

  if (config.zoom) {
    [].push.apply(signals, [
      {
        name: "zoomAnchor",
        value: 0,
        on: [
          {
            events: "wheel",
            update: dimension.time
              ? "time(invert('x', x()))"
              : "invert('x', x())"
          }
        ]
      },
      {
        name: "zoom",
        value: 0,
        on: [
          {
            events: "wheel!",
            force: true,
            update: "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
          }
        ]
      }
    ] as Signal[]);
  }

  if (config.showInterestingness) {
    [].push.apply(signals, [
      {
        name: "brushSingleStart",
        value: null,
        on: [
          {
            events: "@chart:mousedown",
            update: "x()"
          },
          {
            events: "@left:mousedown, @left_grabber:mousedown",
            update: "brush[1]"
          },
          {
            events: "@right:mousedown, @right_grabber:mousedown",
            update: "brush[0]"
          }
        ]
      },
      {
        name: "brushMoveStart",
        value: null,
        on: [
          {
            events: "@brush:mousedown",
            update: "abs(span(brush))"
          }
        ]
      }
    ] as Signal[]);
  }

  if (logging) {
    signals.push({
      name: "brushMouse",
      value: 0,
      on: [
        {
          events: "@chart:mousedown",
          update: "1"
        },
        {
          events: "window:mouseup",
          update: "0"
        }
      ]
    });
  }

  if (config.showBase) {
    marks.push({
      type: "text",
      name: "toggleShowBase",
      encode: {
        enter: {
          x: { signal: "width" },
          y: { value: -8 },
          align: { value: "right" },
          cursor: { value: "pointer" },
          fontWeight: { value: "bold" },
          fill: { value: "black" }
        },
        update: {
          text: { signal: "showBase ? 'Hide Base' : 'Show Base'" }
        }
      }
    } as Mark);
  }

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
          x: { signal: "width", offset: 10 },
          y: { value: 10 },
          tooltip: {
            signal: '"View ready: " + ready'
          }
        }
      }
    } as Mark);
  }

  if (config.chartCount) {
    marks.push({
      type: "text",
      from: { data: "sum" },
      encode: {
        update: {
          x: { signal: "width", offset: 5 },
          y: { value: 30 },
          text: { field: "sum" }
        }
      }
    } as Mark);

    data.push({
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
    } as Data);
  }

  const scales: Scale[] = [
    {
      name: "y",
      type: "linear",
      domain: {
        fields: [
          { data: "base", field: "value" },
          { data: "table", field: "value" }
        ]
      },
      range: [{ signal: "histHeight" }, 0],
      nice: true,
      zero: true
    },
    {
      name: "x",
      type: dimension.time ? "time" : "linear",
      domain: {
        signal: "domain"
      },
      range: "width",
      zero: false
    } as Scale,
    {
      name: "snap",
      type: "threshold",
      domain: {
        signal: "sequence(bin.start + step / 2, bin.stop, step)"
      },
      range: {
        signal:
          "repeatInvisible(sequence(bin.start, bin.stop + step, step), invert('x', 0), invert('x', width))"
      }
    }
  ];

  const vgSpec: Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    autosize: "pad",
    width: config.histogramWidth,
    padding: 5,
    data: data,
    signals: signals,

    title: {
      text: view.title || "",
      anchor: "start",
      frame: "group",
      fontSize: 14,
      offset: -12
    },

    layout: {
      padding: { row: 10 },
      columns: 1,
      bounds: "full",
      align: "each"
    },

    marks: marks,

    scales: scales,

    config: { axisY: { minExtent: AXIS_Y_EXTENT } }
  };

  if (config.zoom) {
    // function to replace invisible steps with visible ones
    expressionFunction("repeatInvisible", repeatInvisible);

    // function to make sure we never zoom the brush outside the view
    expressionFunction("keepWithin", (range, bounds) => {
      bounds = extent(bounds);
      if (bounds[0] < range[0]) {
        range[0] = bounds[0];
      }
      if (bounds[1] > range[1]) {
        range[1] = bounds[1];
      }
      return range;
    });
  }

  const runtime = parse(vgSpec);

  const vgView = new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer("svg")
    .run();

  vgView["_spec"] = vgSpec;
  return vgView;
}
