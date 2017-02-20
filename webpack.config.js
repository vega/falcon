const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: {
    vendor: ['d3', 'pako', 'kd.tree'],
    app: './client/index.ts'
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: "[name].js",
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js'] // note if using webpack 1 you'd also need a '' in the array as well
  },
  devtool: 'source-map',
  module: {
    loaders: [ // loaders will work with webpack 1 or 2; but will be renamed "rules" in future
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader' }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity
    })
  ]
}
