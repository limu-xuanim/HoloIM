import {registerCommand, executeCommand} from '../commander';
import platform from '../../platform';
import Lang from '../lang';
import {openUrl} from './url';
import {setRoutePath} from './router';
import {showWebviewDialog} from '~/app/views/common/webview-dialog';

/**
 * 在系统默认浏览器中打开链接
 * @param {string} url 要打开的链接
 * @returns {void}
 */
export const openUrlInBrowser = url => platformUI.openExternal(url);

/**
 * 平台提供的通用界面交互访问对象
 * @type {Object}
 * @private
 */
const platformUI = platform.access('ui');

/**
 * 平台提供的剪切板功能访问对象
 * @type {Object}
 * @private
 */
const clipboard = platform.access('clipboard');

/**
 * 自动清除拷贝成功提示计时器 ID
 * @type {number}
 * @private
 */
let clearCopyCodeTip = null;
if (clipboard?.writeText) {
    // 注册处理拷贝代码命令
    registerCommand('copyCode', context => {
        const {targetElement: element} = context;
        if (element) {
            if (clearCopyCodeTip) {
                clearTimeout(clearCopyCodeTip);
                clearCopyCodeTip = null;
            }
            const code = element.nextElementSibling.innerText;
            clipboard.writeText(code);
            element.setAttribute('data-hint', Lang.string('common.copied'));
            element.classList.add('hint--success');
            clearCopyCodeTip = setTimeout(() => {
                clearCopyCodeTip = null;
                element.setAttribute('data-hint', Lang.string('common.copyCode'));
                element.classList.remove('hint--success');
            }, 2000);
            return true;
        }
        return false;
    });
}

// 注册路由命令
registerCommand('setRoute', (_, ...params) => {
    setRoutePath(...params);
}, null, {apiLevel: 6});

// 注册在对话框中打开链接命令
registerCommand('openUrlInDialog', (context, url) => {
    const {options} = context;
    if (!url && options && options.url) {
        ({url} = options.url);
    }
    if (url) {
        showWebviewDialog(url, options);
        return true;
    }
    return false;
}, null, {apiLevel: 5});

// 注册在系统默认浏览器中打开链接命令
registerCommand('openUrlInBrowser', (context, url) => {
    if (!url && context.options && context.options.url) {
        ({url} = context.options.url);
    }
    if (url) {
        platformUI.openExternal(url);
        return true;
    }
    return false;
}, null, {apiLevel: 5});

if (window.electronAPI) {
    const EVENT_APP_OPEN_URL = platform.access('remoteEvents.EVENT_APP_OPEN_URL');
    window.electronAPI.ipcRenderer.on[EVENT_APP_OPEN_URL]((e, url) => {
        openUrl(url);
    });
}
