/**
 * Setup and run the development server for Hot-Module-Replacement
 * https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
 */
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import express from 'express';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import open from 'open';
import minimist from 'minimist';
import https from 'node:https';

import electronConfig from './electron.renderer.development';
import browserConfig from './browser.development';

// 获取命令行参数
const argv = minimist(process.argv.slice(2));

// 根据参数判断 targer 是否是 browser
const isBrowserTarget = argv.target === 'browser';
if (isBrowserTarget) {
    console.log('Server for browser target.');
}
const PORT: number = process.env.PORT || argv.port || 3000;
const HOST: string = process.env.HOST || argv.host || 'localhost';
const HTTPS = (process.env.HTTPS || argv.https) === 'true';
const HTTPS_CERT: string = process.env.HTTPS_CERT || argv.httpsCert;
const HTTPS_KEY: string = process.env.HTTPS_KEY || argv.httpsKey;

// 根据 target 参数使用不同的 webpack 配置
const config = isBrowserTarget ? browserConfig : electronConfig;
const app = express();
const compiler = webpack(config);

// 创建 Webpack 开发中间件
const wdm = webpackDevMiddleware(compiler, {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    },
    publicPath: config[0].output!.publicPath,
    stats: {
        colors: true
    }
});

// 使用 Webpack 开发中间件
app.use(wdm);

// 使用 Webpack 热更新中间件
app.use(webpackHotMiddleware(compiler));

if (isBrowserTarget) {
    app.use(express.static(path.resolve(__dirname, '../')));
    app.use(express.static(path.resolve(__dirname, '../app/')));
}

// 创建一个 Web server
const APP = HTTPS
    ? https.createServer({cert: readFileSync(HTTPS_CERT), key: readFileSync(HTTPS_KEY)}, app)
    : app;

const server = APP.listen(PORT, HOST, () => {
    if (argv['start-hot']) {
        spawn('npm', ['run', 'start-hot'], {shell: true, env: process.env, stdio: 'inherit'})
            .on('close', code => process.exit(code))
            .on('error', spawnError => console.error(spawnError));
    }

    console.log(`Listening at http${HTTPS ? 's' : ''}://${HOST}:${PORT}`);

    if (isBrowserTarget) {
        open(`http${HTTPS ? 's' : ''}://${HOST}:${PORT}?HOT=1&HOT_SERVER=_SELF&NODE_ENV=development${HTTPS ? '&HTTPS=1' : ''}`);
    }
});

// 终止服务
process.on('SIGTERM', () => {
    wdm.close(() => {
        console.log('Stopping dev server');
    });
    server.close(() => {
        process.exit(0);
    });
});
