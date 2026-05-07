/**
 * Build config for electron 'Renderer Process' file
 */

import path from 'node:path';
import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import merge from 'webpack-merge';
import {EsbuildPlugin} from 'esbuild-loader';
import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer';
import baseConfig from './base.config';
import {WindowType} from '~/app/constants';

export default [merge(baseConfig, {
    entry: {
        [WindowType.main]: path.resolve(__dirname, '../app/index'),
        [WindowType.gallery]: path.resolve(__dirname, '../app/entries/gallery/index'),
        [WindowType.webview]: path.resolve(__dirname, '../app/entries/webview/index'),
        [WindowType.chathistory]: path.resolve(__dirname, '../app/entries/chathistory/index'),
    },

    output: {
        path: path.resolve(__dirname, '../app/dist/'),
        publicPath: 'auto',
        filename: '[name].js',
    },

    module: {
        rules: [
            // Style
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

    plugins: [
        // for bindings package, see https://github.com/rwaldron/johnny-five/issues/1101#issuecomment-213581938
        new webpack.ContextReplacementPlugin(/bindings$/, /^$/),

        // NODE_ENV should be production so that modules do not perform certain development checks
        new webpack.DefinePlugin({
            DEBUG: JSON.stringify(false),
            'process.env.NODE_ENV': JSON.stringify('production')
        }),

        new MiniCssExtractPlugin(),

        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle.analyze.production.html'
        })
    ],

    optimization: {
        minimize: true,
        minimizer: [
            new EsbuildPlugin({
                target: 'es2022',
                css: true,
                minifyWhitespace: true,
                minifyIdentifiers: true,
                minifySyntax: true,
                treeShaking: true
            }),
        ],
    },

    externals: ['bindings'],

    // https://github.com/chentsulin/webpack-target-electron-renderer#how-this-module-works
    target: 'electron-renderer'
}), merge(baseConfig, {
    entry: path.resolve(__dirname, '../app/context-bridge/preload'),
    output: {
        path: path.resolve(__dirname, '../app/dist/'),
        publicPath: 'auto',
        filename: 'preload.js',
    },
    plugins: [
        // NODE_ENV should be production so that modules do not perform certain development checks
        new webpack.DefinePlugin({
            DEBUG: JSON.stringify(false),
            'process.env.NODE_ENV': JSON.stringify('production')
        }),

        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle.analyze.production.html'
        })
    ],

    optimization: {
        minimize: true,
        minimizer: [
            new EsbuildPlugin({
                target: 'es2020',
                css: true,
                minifyWhitespace: true,
                minifyIdentifiers: true,
                minifySyntax: true,
                treeShaking: true
            }),
        ],
    },
    target: 'electron-preload'
})];
