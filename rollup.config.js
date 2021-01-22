import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "build/src/index.js",
  output: {
    file: "build/falcon.js",
    format: "umd",
    name: "bcf",
    sourcemap: true
  },
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    json()
  ]
};
