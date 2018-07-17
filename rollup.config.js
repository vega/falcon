import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";

export default {
  input: "build/src/index.js",
  output: {
    file: "build/big-crossfilter.js",
    format: "umd",
    name: "bcf",
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs({
      namedExports: {
        "node_modules/ndarray-ops/ndarray-ops.js": ["sub", "add"]
      }
    }),
    json()
  ]
};
