import nodeResolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import json from 'rollup-plugin-json'

export default {
  input: 'client/index.ts',
  output: {
    file: 'public/client.js',
    format: 'iife'
  },
  sourcemap: true,
  plugins: [
    resolveCache(nodeResolve({main: true, jsnext: true})),
    json(),
    typescript({
      tsconfig: "tsconfig.json"
    })
  ]
};

/**
 * Rollup plugin that caches node_modules resolutions. This ensures
 * only one version of each module is included in the output bundle,
 * BUT assumes that all shared dependencies are of the same version.
 * This plugin is handy to avoid import issues when using npm link.
 */
function resolveCache(_) {
  var cache = {};
  return {
    resolveId: function(importee, importer) {
      return (importee && importee[0] !== '.')
        ? cache[importee] || (cache[importee] = _.resolveId(importee, importer))
        : _.resolveId(importee, importer);
    }
  };
}
