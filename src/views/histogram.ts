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

export const darkerBlue = "#4c78a8";

export function loadingMarks(heightSignal: string, rotate = false) {
  return [
    {
      type: "rect",
      interactive: false,
      encode: {
        enter: {
          x: { value: 0 },
          y: { value: 0 },
          x2: { signal: "width" },
          y2: { signal: heightSignal },
          fill: { value: "white" }
        },
        update: {
          opacity: { signal: "pending ? '0.9' : '0'" }
        }
      }
    },
    {
      type: "text",
      interactive: false,
      encode: {
        enter: {
          text: { value: "Loading View..." },
          baseline: { value: "middle" },
          align: { value: "center" },
          x: { signal: "width", mult: 0.5 },
          y: { signal: heightSignal, mult: 0.5 },
          fill: { value: "grey" },
          fontSize: { value: 18 },
          ...(rotate ? { angle: { value: -90 } } : {})
        },
        update: {
          opacity: { signal: "pending ? '1' : '0'" }
        }
      }
    }
  ] as Mark[];
}

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
              x: config.toggleBase
                ? {
                    signal: "width",
                    mult: 0.5,
                    offset: 5
                  }
                : { signal: "width" },
              y: { value: -8 },
              align: config.toggleBase ? { value: "left" } : { value: "right" },
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
              x: config.toggleBase
                ? { signal: "width", mult: 0.5, offset: -5 }
                : { signal: "width", offset: -80 },
              y: { value: -8 },
              align: { value: "right" },
              fill: { value: "#666" }
            },
            update: {
              text: {
                signal: `span(brush) ? '[' + ${
                  dimension.time ? "timeFormat" : "format"
                }(brush[reverseBrush ? 1 : 0], '${dimension.format}') + ',' + ${
                  dimension.time ? "timeFormat" : "format"
                }(brush[reverseBrush ? 0 : 1], '${
                  dimension.format
                }') + ']' : ''`
              }
            }
          }
        },
        {
          type: "group",
          name: "chart",
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
                      opacity: { value: 0.07 }
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
                      opacity: { signal: "approximate ? 0.7 : 1" },
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
        },
        ...loadingMarks("histHeight")
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
      events: "mouseup, touchend",
      update: "span(brush) ? brush : 0"
    },
    {
      events:
        "@chart:dblclick!, @brush:dblclick!, @left_grabber:dblclick!, @left:dblclick!, @right_grabber:dblclick!, @right:dblclick!, @reset:click!, @reset:touchstart!",
      update: "0"
    },
    {
      events: { signal: "pan" },
      update:
        "clampRange(panLinear(anchor, pan / span(anchor)), invert('x', 0), invert('x', width))"
    },
    {
      events:
        "[@chart:mousedown, window:mouseup] > window:mousemove!," +
        " [@chart:touchstart, window:touchend] > window:touchmove",
      update: "[down, clamp(snapped, invert('x', 0), invert('x', width))]"
    },
    {
      events:
        "[@left:mousedown, window:mouseup] > window:mousemove!, [@left_grabber:mousedown, window:mouseup] > window:mousemove!," +
        "[@left:touchstart, window:touchend] > window:touchmove, [@left_grabber:touchstart, window:touchend] > window:touchmove",
      update:
        "[clamp(snapped, invert('x', 0), invert('x', width)), scale('snap', brush[1])]"
    },
    {
      events:
        "[@right:mousedown, window:mouseup] > window:mousemove!, [@right_grabber:mousedown, window:mouseup] > window:mousemove!," +
        "[@right:touchstart, window:touchend] > window:touchmove, [@right_grabber:touchstart, window:touchend] > window:touchmove",
      update:
        "[scale('snap', brush[0]), clamp(snapped, invert('x', 0), invert('x', width))]"
    }
  ];

  const signals: Signal[] = [
    { name: "histHeight", value: config.histogramHeight },
    { name: "pending", value: false },
    { name: "approximate", value: false },
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
      value: config.showBase,
      on: [
        {
          events: "@toggleShowBase:click!, @toggleShowBase:touchstart!",
          update: "!showBase"
        }
      ]
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
          events:
            "window:mousemove, window:touchstart, window:touchend, window:touchmove",
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
          events:
            "@chart:mousedown, @chart:touchstart, @brush:mousedown, @brush:touchstart",
          update: "snapped"
        }
      ]
    },
    {
      name: "anchor",
      value: 0,
      on: [
        {
          events: "@brush:mousedown, @brush:touchstart",
          update: "[scale('snap', brush[0]), scale('snap', brush[1])]"
        }
      ]
    },
    {
      name: "pan",
      value: 0,
      on: [
        {
          events:
            "[@brush:mousedown, window:mouseup] > window:mousemove!, [@brush:touchstart, window:touchend] > window:touchmove",
          update: "down - snapped"
        }
      ]
    },
    {
      name: "binBrush",
      update:
        "span(brush) ? [(brush[0] - bin.start) / step, (brush[1] - bin.start) / step] : 0"
    },
    {
      name: "pixelBrush",
      update: "span(brush) ? [scale('x', brush[0]), scale('x', brush[1])] : 0"
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
    signals.push(
      ...([
        {
          name: "zoomAnchor",
          value: 0,
          on: [
            {
              events:
                "@chart:wheel, @brush:wheel, @left:wheel, @left_grabber:wheel, @right:wheel, @right_grabber:wheel",
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
              events:
                "@chart:wheel!, @brush:wheel!, @left:wheel!, @left_grabber:wheel!, @right:wheel!, @right_grabber:wheel!",
              force: true,
              update: "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
            }
          ]
        }
      ] as Signal[])
    );
  }

  if (config.showInterestingness) {
    signals.push(
      ...([
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
      ] as Signal[])
    );
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

  if (config.toggleBase) {
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
          text: { signal: "showBase ? 'Hide Unfiltered' : 'Show Unfiltered'" }
        }
      }
    } as Mark);
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

    config: { axisY: { minExtent: config.yAxisExtent } }
  };

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

  const runtime = parse(vgSpec);

  const vgView = new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer(config.renderer)
    .run();

  vgView["_spec"] = vgSpec;
  return vgView;
}
