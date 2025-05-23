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
            presets: ['@babel/preset-env'], // If you use modern JavaScript features
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
