// @ts-check

/**
 * 入口文件：main.development.js
 * 这是 Electron 主进程的入口文件
 */
import {app} from 'electron';
import os from 'node:os';
import './utils/debug';
import './main-process/perf-remote';
import {installExtensions} from './main-process/dev-extensions';
import XuanxuanApp from './main-process/app';
import registerRemoteEvents from './main-process/register-remote-events';

PERF_MARK('electronBoot');

// 禁用自签发证书警告
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('ignore-urlfetcher-cert-requests', 'true');

/** 关闭站点隔离试验（CORS）
 *  @see https://github.com/electron/electron/issues/18214
 */
app.commandLine.appendSwitch('disable-site-isolation-trials')

const xuanxuanApp = new XuanxuanApp();

// 检查是否已经打开了其他程序实例
// 此机制确保系统中仅仅只有一个程序实例在运行，因为程序已经支持多窗口模式，所以多个程序实例没有意义
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    // 如果已经打开，则退出
    try {
        app.quit();
        process.exit(0);
    // biome-ignore lint/suspicious/noEmptyBlockStatements: <explanation>
    } catch {}
} else {
    // hack alert: 下面的 if 是确保界面加载完成后再进行弹窗，防止用户心急点击打开好多次从而报错，但可能得想个别的办法
    // 监听请求打开第二个实例事件，提示用户创建一个新的聊天窗口
    app.on('second-instance', (/* event, commandLine, workingDirectory */) => {
        if (os.platform() === 'linux') {
            if (DEBUG) {
                console.log('>> ElectronApp: second-instance.', process.uptime());
            }
            if (process.uptime() > 5) {
                xuanxuanApp.requestCreateMainWindow();
            }
        } else {
            xuanxuanApp.openOrCreateWindow();
        }
    });
}

// 当 Electron 初始化完毕且创建完窗口时调用
app.on('ready', async () => {
    PERF_MARK('electronReady', 'electronBoot', 'electronBootTime');

    if (DEBUG) {
        console.log('>> ElectronApp: ready.');
    }

    // 通知应用管理程序就绪
    xuanxuanApp.ready();
});

app.whenReady()
    .then(async () => {
        registerRemoteEvents();
        // 安装 Electron 调试扩展
        installExtensions();
    })
    .catch(console.error);
