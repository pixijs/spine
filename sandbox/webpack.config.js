const webpack = require('webpack');
const ForkCheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;

module.exports = {
  entry: {
    'pixi-spine': ['./bin/pixi-spine.js', './sandbox/src/app.ts']
  },
  externals: {
    'pixi.js': 'PIXI'
  },
  output: {
    path: 'sandbox/build/webpack',
    filename: '[name].bundle.js',
    sourceMapFilename: '[name].bundle.map'
  },
  resolve: {
    extensions: ['', '.ts', '.js'],
    modulesDirectories: ['node_modules'],
    root: ['src']
  },
  resolveLoader: {
    modulesDirectories: [
      'node_modules'
    ]
  },
  module: {
    unknownContextRegExp: /$^/,
    unknownContextCritical: false,
    exprContextRegExp: /$^/,
    exprContextCritical: false,
    wrappedContextCritical: true,
    preLoaders: [
      /*
       * Source maps
       */
      {
        test: /\.ts$/,
        loader: 'source-map-loader'
      }
    ],
    loaders: [
      /*
       * Typescript loader
       */
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader'
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.md$/,
        loader: 'html!markdown'
      },
      {
        test: /pixi-spine\.js$/,
        loader: 'script'
      }
    ]
  },
  plugins: [
    /*
     * Plugin: ForkCheckerPlugin
     * Description: Do type checking in a separate process, so webpack don't need to wait
     */
    new ForkCheckerPlugin(),
    /*
     * Plugin: OccurenceOrderPlugin
     * Description: Varies the distribution of the ids to get the smallest id length
     * for often used ids.
     */
    new webpack.optimize.OccurenceOrderPlugin(true),
    new webpack.ProvidePlugin({
      'PIXI': 'pixi.js'
    })
  ],
  debug: true,
  watchOptions: {
    poll: true,
    ignored: '/node_modules/'
  },
  node: {
    global: 'window',
    crypto: 'empty',
    process: true,
    module: false,
    clearImmediate: false,
    setImmediate: false
  }
};
