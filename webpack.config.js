const nodeExternals = require('webpack-node-externals')

module.exports = {
  entry: './src/api.js',
  target: 'node',
  mode: 'production',
  output: {
    path: __dirname,
    filename: 'index.js',
    libraryTarget: 'commonjs2'
  },
  externals: [nodeExternals()]
}
