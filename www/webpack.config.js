const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');

module.exports = {
  entry: "./bootstrap.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bootstrap.js"
  },
  mode: "production",
  plugins: [
    new CopyWebpackPlugin({'patterns': ['index.html', 'favicon.png']})
  ],
  experiments: {
    asyncWebAssembly: true,
    syncWebAssembly: true
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};
