const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './js/cookie-fer.js', // Your main JS file
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cookie-fer.min.js', // The output JS file
    libraryTarget: 'module', // If you want to use it as a module in other files
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/, // Matches all .js files
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            // The bundle is an ES module, so only browsers with module support ever load it – no ES5 output needed
            presets: [['@babel/preset-env', { targets: { esmodules: true } }]],
          },
        },
      },
      // No rules for SCSS/CSS since we're handling it separately
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false, 
      }),
    ],
  },
  mode: 'production',
};
