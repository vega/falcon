import { parse, Spec, View, Warn } from "vega-lib";

export function createTextView(el: Element, view: View0D) {
  const vgSpec: Spec = {
    padding: 10,
    height: 20,

    data: [
      {
        name: "base"
      },
      {
        name: "table"
      }
    ],

    marks: [
      {
        type: "text",
        from: { data: "table" },
        encode: {
          enter: {
            x: { value: 0 },
            y: { value: 0 },
            fontSize: { value: 16 },
            fontWeight: { value: "bold" },
            fill: { value: "#000" },
            text: { signal: `'${view.title}: ' + format(datum.value, 'd')` }
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
