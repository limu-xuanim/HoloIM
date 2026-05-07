/**
 * Build config for electron 'Renderer Process' file
 */

import path from 'node:path';
import {EsbuildPlugin} from 'esbuild-loader';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import merge from 'webpack-merge';
import baseConfig from './base.config';
import webpack from 'webpack';

export default [merge(baseConfig, {
    entry: {
        main: './app/index'
    },

    output: {
        path: path.join(__dirname, '../app/web-dist'),
        publicPath: '../dist/',
        filename: '[name].js',
        library: {
            name: '__FIX_DUMMY_LIBRARY_NAME_NOT_ALLOWED__',
            type: 'var',
        }
    },

    module: {
        rules: [
            {
                test: /\.less$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'less-loader']
            },

            // Fonts
            {test: /\.woff(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},
            {test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},
            {test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},
            {test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},
            {test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, type: 'asset/resource'},

            // Images
            {
                test: /\.(?:ico|gif|png|jpg|jpeg|webp)$/,
                type: 'asset/resource',
            }
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
        // https://webpack.github.io/docs/list-of-plugins.html#occurrenceorderplugin
        // https://github.com/webpack/webpack/issues/864
        // https://github.com/js-dxtools/webpack-validator/issues/155
        // OccurenceOrderPlugin is renamed to OccurrenceOrderPlugin
        // However it was not mentioned that it is now enabled by default - so you can just remove the line
        // new webpack.optimize.OccurrenceOrderPlugin(),

        // NODE_ENV should be production so that modules do not perform certain development checks
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        }),

        new MiniCssExtractPlugin(),
    ],

    optimization: {
        minimize: true,
        minimizer: [
            new EsbuildPlugin({
                target: 'es2015',
                css: true,
                minifyWhitespace: true,
                minifyIdentifiers: true,
                minifySyntax: true,
                treeShaking: true
            }),
        ],
    },

    target: 'web'
})];
