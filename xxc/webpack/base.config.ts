/**
 * Base webpack config used across other specific configs
 */
import path from 'node:path';
import type {Configuration, RuleSetRule} from 'webpack';
import WebpackBar from 'webpackbar';
import {dependencies as externals} from '~/app/package.json';
import fse from '../nodejs/fs-helper';

// Read env from webpack.env.json
if (!process.env.DISABLE_ENV_CONFIG || process.env.DISABLE_ENV_CONFIG === 'false') {
    const userEnv = fse.readJsonSync(path.join(__dirname, './webpack.env.json'), {throws: false});
    if (userEnv) {
        Object.assign(process.env, userEnv);
        console.log(`> Load user env from ${path.join(__dirname, './webpack.env.json')}`, userEnv);
    }
}

const rules: RuleSetRule[] = [
    {
        test: /\.(tsx?|jsx?)$/,
        use: [
            {
                loader: 'thread-loader',
                options: {
                    workers: 4,
                    workerParallelJobs: 50,
                },
            },
            {
                loader: 'esbuild-loader',
                options: {
                    target: 'es2022',
                    minify: !(process.env.NODE_ENV === 'development'),
                },
            },
        ],
        exclude: /node_modules/,
    },
    {
        test: /node_modules[\\/]iconv-lite[\\/].+/,
        resolve: {
            aliasFields: ['main'],
        },
    },
    {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
    },
];

export default {
    mode: 'production',

    module: {
        rules,
    },

    output: {
        path: path.join(__dirname, '../app'),
        filename: 'main.js',
    },

    // https://webpack.github.io/docs/configuration.html#resolve
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        mainFields: ['webpack', 'browser', 'web', 'browserify', ['jam', 'main'], 'main'],
        alias: {
            '~': path.join(__dirname, '..'),
            Platform: 'platform/electron',
            '@tiptap/react': path.resolve(__dirname, '../node_modules/@tiptap/react/dist/index.cjs'),
            '@tiptap/starter-kit': path.resolve(__dirname, '../node_modules/@tiptap/starter-kit/dist/index.cjs'),
        },
        modules: [path.join(__dirname, '../app'), path.join(__dirname, '../node_modules')],
        // webpack 5不再自动polyfill Node.js的核心模块，这意味着如果你在浏览器或类似的环境中运行的代码中使用它们，你必须从NPM中安装兼容的模块，并自己包含它们
        fallback: {
            path: require.resolve('path-browserify'),
        },
    },
    plugins: [new WebpackBar({profile: true})],

    externals: Object.keys(externals),
} as Configuration;
