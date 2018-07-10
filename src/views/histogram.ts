import { AXIS_Y_EXTENT } from "./bar";
import {
  Data,
  EncodeEntry,
  Mark,
  OnEvent,
  parse,
  Signal,
  Spec,
  View
} from "vega-lib";
import { View1D } from "./../api";
import { Config } from "../config";

export const HISTOGRAM_WIDTH = 600;

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
              text: { signal: "brush ? 'Reset Brush' : ''" }
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
                signal: `brush ? '[' + format(brush[0], '${
                  dimension.format
                }') + ',' + format(brush[1], '${dimension.format}') + ']' : ''`
              }
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
              fill: { value: "transparent" },
              cursor: { value: "crosshair" }
            },
            update: {
              // hack: clip brush when it is inactive
              clip: { signal: "pixelBrush[0] === -10" }
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
              type: "rect",
              interactive: false,
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
              interactive: false,
              from: { data: "table" },
              encode: {
                update: {
                  ...barEncodeBase,
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
              y: { field: "view", scale: "y" },
              height: { scale: "y", band: true }
            },
            update: {
              fill: { field: "value", scale: "color" }
            }
          }
        }
      ],
      scales: [
        {
          name: "y",
          type: "band",
          domain: { data: "interesting", field: "view" },
          range: [0, { signal: "length(data('interesting')) ? 40 : 0" }],
          paddingInner: 0.1,
          paddingOuter: 0
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
          scale: "y",
          orient: "left"
        }
      ]
    }
  ];

  const onBrush: OnEvent[] = [
    {
      events:
        "@chart:dblclick!, @brush:dblclick!, @left_grabber:dblclick!, @left:dblclick!, @right_grabber:dblclick!, @right:dblclick!, @reset:click!",
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
  ];

  if (config.zoomBrush) {
    onBrush.push({
      events: { signal: "zoom" },
      update: "clampRange(zoomLinear(brush, down, zoom), bin.start, bin.stop)"
    } as OnEvent);
  }

  const signals: Signal[] = [
    { name: "active", update: false },
    { name: "bin", update: JSON.stringify(dimension.binConfig) },
    {
      name: "brush",
      value: 0,
      on: onBrush
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
    },
    {
      name: "showBase",
      value: true,
      on: [{ events: "@toggleShowBase:click!", update: "!showBase" }]
    }
  ];

  if (logging) {
    signals.push({
      name: "brushMouse",
      value: 0,
      on: [
        {
          events: "@chart:mousedown",
          update: "2"
        },
        {
          events: "window:mouseup",
          update: "brushMouse === 2 ? 1 : 0"
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

  if (config.activeViewIndicator) {
    marks.push({
      type: "symbol",
      encode: {
        enter: {
          shape: { value: "circle" },
          stroke: { value: "black" }
        },
        update: {
          fill: {
            signal: 'active ? "black" : "transparent"'
          },
          x: { signal: "width", offset: 10 },
          y: { value: 10 },
          tooltip: {
            signal: '"Currently active: " + active'
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

  if (config.zoomBrush) {
    signals.push({
      name: "zoom", // in pixel space
      value: 0,
      on: [
        {
          events: "@brush:wheel!",
          update: "pow(1.001, event.deltaY * pow(16, event.deltaMode))"
        }
      ]
    } as Signal);
  }

  const vgSpec: Spec = {
    $schema: "https://vega.github.io/schema/vega/v4.0.json",
    autosize: "fit-y",
    width: HISTOGRAM_WIDTH,
    height: HISTOGRAM_WIDTH / 3,
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
      padding: { row: 40 },
      columns: 1,
      bounds: "full",
      align: "each"
    },

    marks: marks,

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
        domain: {
          fields: [
            { data: "base", field: "value" },
            { data: "table", field: "value" }
          ]
        },
        range: "height",
        nice: true,
        zero: true
      }
    ],
    axes: [
      {
        scale: "y",
        orient: "left",
        labelOverlap: true,
        tickCount: { signal: "ceil(height/40)" },
        title: "Count",
        grid: true
      },
      {
        scale: "x",
        orient: "bottom",
        labelOverlap: true,
        tickCount: { signal: "ceil(width/20)" }
      }
    ],
    config: { axisY: { minExtent: AXIS_Y_EXTENT } }
  };

  const runtime = parse(vgSpec);

  const vgView = new View(runtime).initialize(el).renderer("svg");

  vgView["_spec"] = vgSpec;
  return vgView;
}
