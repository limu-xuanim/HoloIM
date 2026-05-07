import env from './env';
import debounce from '../../utils/debounce';
import * as windowController from './window-controller';
import {reloadWindow} from './window-controller';
import {EVENT_WINDOW_WILL_CLOSE} from './remote-events';
import type {IpcRendererEvent} from 'electron';

type Config = import('~/app/config').Config;

/** 当前窗口名称 */
export const winName = env.windowName;

/**
 * 获取当前窗口是否为第一个打开的主窗口
 * @returns 如果为 true，则表示当前窗口是主窗口
 */
export const isFirstMainWindow = () => winName === 'main-1';

/**
 * 用户数据目录
 */
export const userDataPath = env.dataPath;

/**
 * 设置 Mac Dock 栏应用图标上的原点提示文本
 *
 * @param label 提示文本
 */
export const setBadgeLabel = (label = '') => {
    if (env.isOSX) {
        window.electronAPI.dockSetBadge(label);
    }
};

/**
 * 设置当前窗口是否在任务栏显示
 * @param flag 是否在任务栏显示
 */
export const setShowInTaskbar = (flag: boolean) => window.electronAPI.currentWindow.setSkipTaskbar(!flag);

/**
 * 设置工具栏图标上的工具提示文本
 * @param value 工具提示文本
 */
export const setTrayTooltip = (value: string) => window.xuanAPI.setTrayTooltip(winName, value);

/**
 * 设置显示在状态栏中托盘图标旁边的标题 (支持ANSI色彩)
 * @param value 标题文本
 */
export const setTrayTitle = (value: string) => window.xuanAPI.setTrayTitle(winName, value);

/**
 * 设置是否闪烁通知栏图标
 * @param value 是否闪烁通知栏图标
 */
export const flashTrayIcon = (value = true) => window.xuanAPI.flashTray(winName, value);

/**
 * 设置是否托盘图标是否变灰
 * @param value 托盘图标是否变灰
 */
export const setTrayToGray = (value = true) => window.xuanAPI.setTrayToGray(winName, value);

/**
 * 请求用户注意操作 ID，在 windows 上为 setTimeout ID，在 macOS 上为 dock.bounce ID
 */
let _attentionId: number = null;

/**
 * 在桌面端请求用户注意
 * @param attention 请求类型
 * @see https://www.electronjs.org/docs/api/dock#dockbouncetype-macos
 */
export const requestAttention = async (attention: false|'normal'|'critical'|'informational' = 'normal') => {
    if (env.isOSX) {
        if (_attentionId) {
            await window.electronAPI.dockCancelBounce(_attentionId);
            _attentionId = null;
        }
        if (attention && attention !== 'normal') {
            _attentionId = await window.electronAPI.dockBounce(attention);
        }
    } else if (env.isWindowsOS) {
        window.electronAPI.currentWindow.flashFrame(!!attention);
    }
    if (attention === 'critical') {
        window.electronAPI.currentWindow.show();
    }
    return _attentionId;
};

/** 窗口请求关闭时的回调函数（此回调函数可以通过返回 false 来取消关闭） */
let _windowRequestCloseHandler: (reason: string) => Promise<boolean> = null;

/** 窗口即将关闭时的回调函数，可以在关闭之前执行退出账号等操作 */
let _windowBeforeCloseHandler: () => Promise<void> = null;

/**
 * 设置窗口请求关闭时的回调函数（此回调函数可以通过返回 false 来取消关闭）
 * @param handler 处理函数
 */
export function setWindowRequestCloseHandler(handler: (reason: string) => Promise<boolean>) {
    _windowRequestCloseHandler = handler;
}

/**
 * 窗口即将关闭时的回调函数，可以在关闭之前执行退出账号等操作
 * @param handler 处理函数
 */
export function setWindowBeforeCloseHandler(handler: () => Promise<void>) {
    _windowBeforeCloseHandler = handler;
}

/**
 * 请求关闭应用窗口
 */
export function closeWindow() {
    return window.xuanAPI.closeWindow(winName);
}

/**
 * 确认立即退出并关闭窗口
 */
export async function confirmToCloseWindow() {
    await window.electronAPI.currentWindow.hide();
    if (_windowBeforeCloseHandler) {
        await _windowBeforeCloseHandler();
    }
    await window.xuanAPI.closeWindow(winName, true);
}

/**
 * 处理主进程请求关闭应用窗口事件
 * @param _ 事件对象
 * @param reason 关闭原因
 */
async function handleRequestCloseWindow(_: Electron.IpcRendererEvent, reason: string) {
    if (!_windowRequestCloseHandler) {
        return;
    }
    const result = await _windowRequestCloseHandler(reason);
    if (result === false) {
        return;
    }

    await confirmToCloseWindow();
}

/**
 * 显示用户点击关闭按钮之前询问用户建议对话框
 * @param options 选项
 * @param options.message 提示文本
 * @param options.rememberText 是否记住选择文本
 * @param options.buttons 操作按钮文本
 * @param options.callback 回调函数
 */
export const showQuitConfirmDialog = async (options: {
    message: string;
    rememberText: string;
    buttons: string[];
    callback?: (result: 'minimize' | 'close' | '', checkboxChecked: boolean) => Promise<'minimize' | 'close' | ''>;
}) => {
    const {
        message, rememberText, buttons, callback
    } = options;
    const {response, checkboxChecked} = await window.electronAPI.showMessageBox({
        type: 'question',
        message,
        checkboxLabel: callback ? rememberText : undefined,
        checkboxChecked: false,
        cancelId: 2,
        defaultId: 0,
        buttons,
    });
    let result = ['minimize', 'close', ''][response] as 'minimize' | 'close' | '';
    if (callback) {
        result = await callback(result, checkboxChecked);
    }
    if (result === 'minimize') {
        windowController.hideWindow();
    } else if (result === 'close') {
        confirmToCloseWindow();
    }
    return result;
};

/**
 * 判断是否在操作系统登录后启动应用
 * @returns 如果返回 `true` 则为是在操作系统登录后启动应用，否则为不是
 */
export const isOpenAtLogin = env.isLinux
    ? null
    : () => (window.electronAPI.getLoginItemSettings(env.isOSX ? null : {args: ['--open-at-login']})).openAtLogin;
// https://www.cnblogs.com/xhznl/p/14301125.html#2

/**
 * 设置是否在操作系统登录后启动应用
 * @param openAtLogin 是否在操作系统登录后启动应用
 */
export const setOpenAtLogin = async (openAtLogin: boolean) => {
    await window.electronAPI.setLoginItemSettings({openAtLogin, args: ['--open-at-login']});
    // Fix disable openAtLogin not work in mac os, see https://github.com/electron/electron/issues/10880#issuecomment-356067655
    if (!openAtLogin && env.isOSX) {
        const appName = await window.electronAPI.getName();
        window.nodeAPI.exec(`osascript -e 'tell application "System Events" to delete login item "${appName}"'`);
    }
};

/**
 * 复制在界面上选中的文本
 */
export const copySelectText = () => {
    window.electronAPI.currentWebContents.copy();
};

/**
 * 选择界面上所有文本
 */
export const selectAllText = () => {
    window.electronAPI.currentWebContents.selectAll();
};

/**
 * 获取应用根目录路径
 * @returns 根目录路径
 */
export const getAppRoot = () => env.appRoot;

/**
 * 获取当前窗口名称
 * @returns 窗口名称
 */
export const getBrowserWindowName = (): string => winName;

/**
 * 获取当前窗口缩放比率
 * @returns 缩放比率
 */
export const getZoomFactor = (): number => {
    // @ts-ignore
    const zoom = Number.parseFloat(document.documentElement.style.zoom);
    return Number.isNaN(zoom) ? 1 : zoom;
};

/**
 * 设置当前窗口缩放比率
 * @param factor 缩放比率
 * @todo zoom已被弃用，考虑使用其他方法代替
 */
export const setZoomFactor = async (factor = 1) => {
    window.electronAPI.currentWebContents.zoomFactor(1);
    const minWidth = Math.max(748, Math.ceil(748 * factor));
    const minHeight = Math.max(510, Math.ceil(510 * factor));
    window.electronAPI.currentWindow.setMinimumSize(minWidth, minHeight);
    const size = window.electronAPI.currentWindow.getSize();
    window.electronAPI.currentWindow.setSize(Math.max(size[0], minWidth), Math.max(size[1], minHeight));
    // @ts-ignore
    document.documentElement.style.zoom = String(factor || 1);
};

/**
 * 设置窗口是否应处于全屏模式
 * @param flag 如果为 true 则设置为全屏模式
 */
export const setFullScreen = async (flag: boolean) => {
    if (flag !== window.electronAPI.currentWindow.isFullScreen()) {
        window.electronAPI.currentWindow.setFullScreen(flag);
    }
};

/**
 * 窗口当前是否已全屏
 * @returns 如果为 true 则为全屏模式
 */
export const isFullscreen = () => window.electronAPI.currentWindow.isFullScreen();

// /**
//  * 监听窗口进入全屏状态事件
//  * @param {Function} listener 事件回调函数
//  * @returns {void}
//  */
// export const onEnterFullscreen = (listener) => window.electronAPI.currentWindow.on('enter-full-screen', listener);

/**
 * 监听窗口退出全屏状态事件
 * @param listener 事件回调函数
 */
export const onLeaveFullscreen = (listener: (event: IpcRendererEvent) => void) => {
    window.electronAPI.onWindowLeaveFullScreen(listener);
};

/**
 * 初始化
 * @param config 运行时配置
 */
export const initElectronUI = async (config: Config) => {
    // 监听主进程请求退出事件
    window.electronAPI.ipcRenderer.on[EVENT_WINDOW_WILL_CLOSE](handleRequestCloseWindow);

    const showInTaskbar = debounce(() => setShowInTaskbar(true), 100);

    // 监听应用窗口激活事件
    window.electronAPI.onWindowRestore(showInTaskbar);
    window.electronAPI.onWindowFocus(showInTaskbar);
    window.electronAPI.onWindowShow(showInTaskbar);

    if (env.entryName === 'main') {
        // 向主进程发送应用窗口界面准备就绪事件
        window.xuanAPI.handleMainWinUIReady(winName, {...config, exts: null});
        // exts: null 用于解决 An object could not be cloned. 有时内置扩展数据可能包含函数，无法发送到主进程
    }
};

// Call shell in remote to fix showItemInFolder in windows
// see https://github.com/electron/electron/issues/4349

/**
 * 使用用户操作系统默认应用程序打开给定的地址，例如使用默认邮件程序发送电子邮件
 * @param url 在 Windows 上最多 2081 个字符
 * @param options 喧喧
 * @returns 使用 Promise 异步返回处理结果
 */
export function openExternal(url: string, options?: Electron.OpenExternalOptions) {
    return window.electronAPI.shellOpenExternal(url, options);
}

/**
 * 以桌面的默认方式打开给定的文件
 * @param path 文件路径
 * @returns 使用 Promise 异步返回处理结果
 */
export function openFileItem(path: string) {
    return window.electronAPI.shellOpenPath(path);
}

/**
 * 在操作系统资源管理器中定位文件
 * @param fullPath 完整路径
 */
export function showItemInFolder(fullPath: string) {
    return window.electronAPI.shellShowItemInFolder(fullPath);
}

export default {
    ...windowController,
    init: initElectronUI,
    userDataPath,
    browserWindowName: winName,
    isFirstMainWindow,

    openExternal,
    showItemInFolder,
    openFileItem,

    setBadgeLabel,
    setShowInTaskbar,
    requestAttention,
    setTrayTooltip,
    setTrayTitle,
    flashTrayIcon,
    setTrayToGray,

    showQuitConfirmDialog,
    closeWindow,
    confirmToCloseWindow,
    setWindowBeforeCloseHandler,
    setWindowRequestCloseHandler,
    isOpenAtLogin,
    setOpenAtLogin,
    copySelectText,
    selectAllText,
    getZoomFactor,
    setZoomFactor,
    setFullScreen,
    isFullscreen,
    onLeaveFullscreen,

    reloadWindow,

    get appRoot() {
        return getAppRoot();
    },
};
