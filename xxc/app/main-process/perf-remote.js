import {ipcMain} from 'electron';
import app from './app';
import {initPerf} from '../utils/perf';
import {PERF_MESSAGE} from '~/app/platform/electron/remote-events';

if (PERF) {

    const {performance, PerformanceObserver} = require('perf_hooks');
    initPerf('main', {
        send: message => process.send(message),
        on: listener => process.on('message', listener),
        messageHandler: message => {
            if (message.target === 'renderer') {
                app.sendToWindow('main', PERF_MESSAGE, message);
                return true;
            }
        },
        cmdHandlers: {
            executeJsOnMainWindow: async (code, userGesture) => {
                try {
                    const result = await app.mainWindow.webContents.executeJavaScript(code, userGesture);
                    return result;
                } catch (error) {
                    console.error('Execute JavaScript on main window error', error);
                }
            },
            resizeWindow: async (width, height, animate = true, waitTime = 2000) => new Promise((resolve) => {
                PERF_MARK('resizeBegin');
                app.mainWindow.setSize(width, height, animate);
                setTimeout(() => {
                    PERF_MARK('resizeEnd', 'resizeBegin', `resizeWindow${width}x${height}`);
                    resolve();
                }, waitTime);
            }),
            /**
             * @param {'maximize'|'unmaximize'|'restore'|'minimize'} action 动作名称
             * @param {number} [waitTime=2000] 等待时间
             * @returns {void}
             */
            changeWindowState: async (action, waitTime = 3000) => new Promise((resolve) => {
                PERF_MARK(`${action}WindowBegin`);
                app.mainWindow[action]();
                setTimeout(() => {
                    PERF_MARK(`${action}WindowEnd`, `${action}WindowBegin`, `${action}Window`);
                    resolve();
                }, waitTime);
            }),
        }
    }, performance, PerformanceObserver);

    ipcMain.on(PERF_MESSAGE, (_, message) => {
        try {
            process.send(message);
        } catch (error) {
            console.error(error);
        }
    });
}
