/* eslint-disable max-len */
/**
 * Build config for development process that uses Hot-Module-Replacement
 * https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
 */

import path from 'node:path';
import webpack from 'webpack';
import merge from 'webpack-merge';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import baseConfig from './base.config';

const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';
const isHttps = process.env.HTTPS === 'true';

export default [merge(baseConfig, {
    mode: 'development',

    // configuration.devtool should match pattern "^(inline-|hidden-|eval-)?(nosources-)?(cheap-(module-)?)?source-map$".
    // BREAKING CHANGE since webpack 5: The devtool option is more strict.
    // Please strictly follow the order of the keywords in the pattern.
    devtool: 'eval-cheap-module-source-map',

    entry: {
        main: [
            `webpack-hot-middleware/client?path=http${isHttps ? 's' : ''}://${host}:${port}/__webpack_hmr`,
            './app/index'
        ],
    },

    output: {
        publicPath: `http${isHttps ? 's' : ''}://${host}:${port}/dist/`,
        filename: '[name].js',
        library: {
            name: '__FIX_DUMMY_LIBRARY_NAME_NOT_ALLOWED__',
            type: 'var',
        }
    },

    module: {
        rules: [
            // Fonts
            {test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},
            {test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},
            {test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},
            {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},
            {test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},

            {
                test: /\.less$/,
                use: [
                    {loader: 'style-loader'},
                    {loader: 'css-loader', options: {importLoaders: 1, sourceMap: true}},
                    {loader: 'postcss-loader'},
                    {loader: 'less-loader', options: {lessOptions: {math: true}, sourceMap: true}}
                ]
            },
            // Spritesheet, etc.
            {test: /\.png(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'}
        ]
    },

    // https://webpack.github.io/docs/configuration.html#resolve
    resolve: {
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
        mainFields: ['webpack', 'browser', 'web', 'browserify', ['jam', 'main'], 'main'],
        alias: {
            Platform: 'platform/browser',
        },
        modules: [
            path.join(__dirname, '../app'),
            path.join(__dirname, '../node_modules'),
            'node_modules'
        ],
        fallback: {
            fs: false,
            util: false,
            stream: false,
            zlib: false,
        }
    },

    plugins: [
        // NODE_ENV should be production so that modules do not perform certain development checks
        new webpack.DefinePlugin({
            DEBUG: JSON.stringify(true),
            'process.env.NODE_ENV': JSON.stringify('development')
        }),

        // https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
        new webpack.HotModuleReplacementPlugin(),

        // https://github.com/pmmmwh/react-refresh-webpack-plugin
        new ReactRefreshWebpackPlugin(),

        // "If you are using the CLI, the webpack process will not exit with an error code by enabling this plugin."
        // https://webpack.docschina.org/plugins/no-emit-on-errors-plugin/
        new webpack.NoEmitOnErrorsPlugin(),
    ],

    target: 'web'
})];
