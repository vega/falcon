import nodeResolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'client/index.ts',
  output: {
    file: 'public/client.js',
    format: 'iife'
  },
  sourcemap: true,
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true
    }),
    typescript({
      tsconfig: "tsconfig.json"
    })
  ]
};
