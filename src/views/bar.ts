import { parse, Spec, View, Warn } from "vega-lib";

export const BAR_HEIGHT = 450;

export function createBarView(el: Element, view: View0D) {
  const vgSpec: Spec = {
    padding: 5,
    height: BAR_HEIGHT,

    data: [
      {
        name: "table"
      }
    ],

    scales: [
      {
        type: "linear",
        name: "y",
        domain: { data: "table", field: "value" },
        nice: true,
        range: "height",
        zero: true
      }
    ],

    axes: [{ orient: "left", scale: "y", title: view.title }],

    marks: [
      {
        type: "rect",
        from: { data: "table" },
        encode: {
          enter: {
            x: { value: 20 },
            width: { value: 24 },
            y2: { scale: "y", value: 0 },
            fill: { value: "steelblue" },
            y: { scale: "y", field: "value" },
            tooltip: { field: "value" }
          }
        }
      }
    ]
  };

  const runtime = parse(vgSpec);

  return new View(runtime)
    .logLevel(Warn)
    .initialize(el)
    .renderer("svg");
}
