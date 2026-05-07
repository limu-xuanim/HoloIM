/**
 * Build config for electron 'Main Process' file
 */

import merge from 'webpack-merge';
import {EsbuildPlugin} from 'esbuild-loader';
import baseConfig from './base.config';
import webpack from 'webpack';
import path from 'node:path';

const DEBUG = process.env.NODE_ENV === 'debug' || process.env.NODE_ENV === 'development';

export default merge(baseConfig, {
    entry: {
        main: path.resolve(__dirname, '../app/main.development.js'),
    },

    // 'main.js' in root
    output: {
        path: path.resolve(__dirname, '../app/'),
        filename: 'main.js'
    },

    plugins: [
        new webpack.DefinePlugin({
            DEBUG: JSON.stringify(DEBUG),
            'process.env.LOG': JSON.stringify(DEBUG ? 3 : 0),
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
        }),
    ],

    optimization: {
        minimize: true,
        minimizer: [
            new EsbuildPlugin({
                target: 'es2022',
                minifyWhitespace: true,
                minifyIdentifiers: true,
                minifySyntax: true,
                treeShaking: true
            }),
        ],
    },

    /**
     * Set target to Electron specific node.js env.
     * https://github.com/chentsulin/webpack-target-electron-renderer#how-this-module-works
     */
    target: 'electron-main',

    /**
     * Disables webpack processing of __dirname and __filename.
     * If you run the bundle in node.js it falls back to these values of node.js.
     * https://github.com/webpack/webpack/issues/2010
     */
    node: {
        __dirname: false,
        __filename: false
    },
});
