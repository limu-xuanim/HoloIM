/* eslint-disable max-len */
/**
 * Build config for development process that uses Hot-Module-Replacement
 * https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
 */

import webpack, {type WebpackPluginInstance} from 'webpack';
import merge from 'webpack-merge';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import {EsbuildPlugin} from 'esbuild-loader';
import baseConfig from './base.config';
import path from 'node:path';
import {writeFile, mkdir} from 'node:fs/promises';
import {WindowType} from '~/app/constants';

const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';
const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
const basePath = `webpack-hot-middleware/client?path=${protocol}://${host}:${port}/__webpack_hmr`;

export default [merge(baseConfig, {
    mode: 'development',

    devtool: 'eval-source-map',

    entry: {
        [WindowType.main]: [
            basePath,
            './app/index'
        ],
        [WindowType.gallery]: [
            basePath,
            './app/entries/gallery/index'
        ],
        [WindowType.webview]: [
            basePath,
            './app/entries/webview/index'
        ],
        [WindowType.chathistory]: [
            basePath,
            './app/entries/chathistory/index'
        ],
    },

    output: {
        publicPath: `${protocol}://${host}:${port}/dist/`,
        filename: '[name].js',
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

    plugins: [
        // NODE_ENV should be production so that modules do not perform certain development checks
        new webpack.DefinePlugin({
            'process.env.LOG': JSON.stringify(3),
            'process.env.NODE_ENV': JSON.stringify('development')
        }),

        // for bindings package, see https://github.com/rwaldron/johnny-five/issues/1101#issuecomment-213581938
        new webpack.ContextReplacementPlugin(/bindings$/, /^$/),

        // https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
        new webpack.HotModuleReplacementPlugin(),

        // https://github.com/pmmmwh/react-refresh-webpack-plugin
        new ReactRefreshWebpackPlugin(),

        // “If you are using the CLI, the webpack process will not exit with an error code by enabling this plugin.”
        // https://webpack.docschina.org/plugins/no-emit-on-errors-plugin/
        new webpack.NoEmitOnErrorsPlugin(),

        new EsbuildPlugin({minify: false}),
    ],

    externals: ['bindings'],

    // https://github.com/chentsulin/webpack-target-electron-renderer#how-this-module-works
    target: 'electron-renderer'
}), merge(baseConfig, {
    mode: 'development',
    devtool: 'eval-source-map',
    entry: {
        preload: [
            basePath,
            './app/context-bridge/preload'
        ]
    },
    output: {
        publicPath: `${protocol}://${host}:${port}/dist/`,
        filename: 'preload.js',
    },
    plugins: [
        // NODE_ENV should be production so that modules do not perform certain development checks
        new webpack.DefinePlugin({
            'process.env.LOG': JSON.stringify(3),
            'process.env.NODE_ENV': JSON.stringify('development')
        }),
        // https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
        new webpack.HotModuleReplacementPlugin(),

        // “If you are using the CLI, the webpack process will not exit with an error code by enabling this plugin.”
        // https://webpack.docschina.org/plugins/no-emit-on-errors-plugin/
        new webpack.NoEmitOnErrorsPlugin(),

        new EsbuildPlugin({minify: false}),

        {
            apply: (compiler) => {
                let preloadEntryChanged = true;

                compiler.hooks.watchRun.tap('WatchPreload', (compilation) => {
                    const {modifiedFiles} = compilation;
                    if (modifiedFiles?.size && [...modifiedFiles].some(x => x.includes('preload.ts'))) {
                        preloadEntryChanged = true;
                    }
                });

                compiler.hooks.afterEmit.tap('AfterEmitPreload', () => {
                    if (preloadEntryChanged) {
                        updatePreloadJs();
                        preloadEntryChanged = false;
                    }
                  });
              },
        } as WebpackPluginInstance,
    ],

    target: 'electron-preload'
})];

async function updatePreloadJs() {
    try {
        const response = await fetch(`${protocol}://${host}:${port}/dist/preload.js`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const preloadPath = path.resolve(__dirname, '../app/dist/preload.js');
        await mkdir(path.dirname(preloadPath), { recursive: true });
        await writeFile(preloadPath, buffer);
        console.log('preload.js 已更新');
    } catch (error) {
        console.log('preload.js 更新失败', error);
    }
}
