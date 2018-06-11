import * as vega from "vega-lib";

const CHART_WIDTH = 600;

export function createView(
  el: Element,
  title: string | undefined,
  step: number,
  bins: number[]
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
            fields: ["count"],
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
      { name: "extent", value: [bins[0], bins[bins.length - 1]] },
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
      },
      {
        name: "pixelRange",
        value: [0, { signal: "width" }],
        on: [
          {
            events: { signal: "range" },
            update:
              '[max(0, scale("x", range[0])), min(scale("x", range[1]), width - 1)]'
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
            fill: { value: "transparent" }
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
                opacity: { value: 0.07 }
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
                  field: "bin_start",
                  offset: 1
                },
                x2: { scale: "x", signal: `datum.bin_start + ${step}` },
                y: { scale: "y", field: "count" },
                y2: { scale: "y", value: 0 },
                fill: { value: "#4c78a8" } // darker blue
              }
            }
          },
          {
            type: "rect",
            interactive: false,
            encode: {
              enter: {
                y: { value: 0 },
                height: { field: { group: "height" } },
                fill: { value: "firebrick" }
              },
              update: {
                x: { signal: 'max(1, scale("x", range[0]))' },
                width: { value: 1 }
              }
            }
          },
          {
            type: "rect",
            interactive: false,
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
          }
        ]
      }
    ],
    scales: [
      {
        name: "x",
        type: "bin-linear",
        domain: bins,
        range: "width"
      },
      {
        name: "y",
        type: "linear",
        domain: { data: "table", field: "count" },
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
        title: title
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
