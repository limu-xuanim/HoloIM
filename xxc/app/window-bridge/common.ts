import type {WindowType} from '../constants';
import type {AppChildWindowDetails} from '../main-process/app-child-window';

/**
 * 在 window 对象上暴露 api
 * @param win window 对象
 * @param name api 名称
 * @param api api
 */
export function exposeInWindow(win: Window, name: string, api: any) {
    Object.defineProperty(win, name, {
        enumerable: true,
        configurable: true,
        writable: false,
        value: Object.freeze(api)
    });
}

/**
 * 获取子窗口
 * @param name 子窗口名称
 * @returns window 对象
 */
export function getTargetWindow(name: string) {
    const mainWindow = getMainWindow();
    return mainWindow.$getChildWindow(name);
}

/**
 * 获取主窗口
 * @returns window 对象
 */
export function getMainWindow(): Window {
    let win = window;

    while (win.opener !== null) {
        win = win.opener;
    }

    return win;
}

/**
 * 获取当前窗口类型
 * @returns 窗口类型
 */
export function getWindowType() {
    return document.body.dataset.entry;
}

/**
 * 当前窗口是否为主窗口
 * @returns 布尔值结果
 */
export function isMainWindow() {
    return window.opener === null;
}

/**
 * 当前窗口是否为子窗口
 * @returns 布尔值结果
 */
export function isChildWindow() {
    return window.opener !== null;
}

/**
 * 生成窗口 url
 * @param type 窗口类型
 * @param name 窗口名称
 * @returns 窗口 url
 */
export function generateWindowUrl(type: ValueOf<typeof WindowType>, name: string) {
    const {APP_ROOT: appRoot, HOT = '', HOT_SERVER = '', HTTPS = ''} = process.env;
    const index = `${appRoot}/index.html`;
    return `file://${index}?ENTRY=${type}&WIN_NAME=${name}&HOT=${HOT}&HOT_SERVER=${HOT_SERVER}&HTTPS=${HTTPS}`;
}

/**
 * 生成窗口 features
 * @param detail window features 键值对
 * @returns 窗口 features
 */
export function generateWindowFeatures(detail: AppChildWindowDetails['options']) {
    return Object.entries(detail).map(([x, y]) => `${x}=${y}`).join(',');
}

/**
 * 打开子窗口
 * @param url url
 * @param name 窗口名称
 * @param features features
 * @returns
 */
export function openWindow(url: string, name: string, features?: string) {
    const mainWindow = getMainWindow();
    const win = mainWindow.$getChildWindow(name);
    if (win) {
        return win;
    }

    const childWin = mainWindow.open(url, '_blank', features);
    if (!childWin) {
        throw new Error(`Can't open window ${url}`);
    }

    mainWindow.$setChildWindow(name, childWin);
    return childWin;
}
