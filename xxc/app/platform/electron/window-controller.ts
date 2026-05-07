import env from './env';
import {BROWSER_WINDOW_EVENT} from '~/app/platform/electron/remote-events';
import type {IpcRendererEvent} from 'electron';

/**
 * 关闭窗口
 */
export function closeWindow() {
    window.electronAPI.currentWindow.close();
}

/**
 * 隐藏应用窗口
 */
export const hideWindow = () => {
    window.electronAPI.currentWindow.hide();
};

/**
 * 激活应用窗口
 */
export const focusWindow = () => {
    window.electronAPI.currentWindow.focus();
};

/**
 * 显示并聚焦应用窗口
 */
export const showAndFocusWindow = () => {
    if (window.electronAPI.currentWindow.isMinimized()) {
        window.electronAPI.currentWindow.restore();
        focusWindow();
        return;
    }
    if (window.electronAPI.currentWindow.isVisible()) {
        focusWindow();
    } else {
        // browserWindow.show 本身会聚焦窗口
        window.electronAPI.currentWindow.show();
    }
};

/**
 * 绑定监听应用窗口获得焦点事件
 * @param listener 事件回调函数
 */
export const onWindowFocus = (listener: (event: IpcRendererEvent) => void) => {
    window.electronAPI.onWindowFocus(listener);
};

/**
 * 绑定监听应用窗口失去焦点事件
 * @param listener 事件回调函数
 */
export const onWindowBlur = (listener: (event: IpcRendererEvent) => void) => {
    window.electronAPI.onWindowBlur(listener);
};

/**
 * 绑定监听应用窗口最小化事件
 * @param listener 事件回调函数
 */
export const onWindowMinimize = (listener: (event: IpcRendererEvent) => void) => {
    window.electronAPI.onWindowMinimize(listener);
};

/**
 * 重新加载窗口
 */
export const reloadWindow = () => {
    window.electronAPI.currentWindow.reload();
};

/**
 * 绑定监听应用窗口还原事件
 * @param listener 事件回调函数
 */
export const onWindowRestore = (listener: (event: IpcRendererEvent) => void) => {
    window.electronAPI.onWindowRestore(listener);
};

/**
 * 判断应用窗口是否为最大化状态
 * @returns 如果为 `true` 则为最大化状态
 */
export const isWindowMaximized = () => window.electronAPI.currentWindow.isMaximized();

/**
 * 绑定监听应用窗口最大化状态变更事件
 * @param listener 事件回调函数
 */
export const onWindowMaximizedChanged = (listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
    window.electronAPI.onWindowMaximize(listener);
    window.electronAPI.onWindowUnmaximize(listener);
};

export const offWindowMaximizedChanged = (listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => {
    if (!window.electronAPI) {
        return;
    }

    window.electronAPI.ipcRendererOff(BROWSER_WINDOW_EVENT.MAXIMIZE, listener);
    window.electronAPI.ipcRendererOff(BROWSER_WINDOW_EVENT.UNMAXIMIZE, listener);
};

/**
 * 切换应用窗口最大化和最小化状态
 * @param toggle 切换应用窗口最大化状态
 */
export const toggleWindowMaximized = (toggle = !window.electronAPI.currentWindow.isMaximized()) => {
    if (toggle) {
        window.electronAPI.currentWindow.maximize();
    } else {
        window.electronAPI.currentWindow.unmaximize();
    }
};

/**
 * 还原应用窗口
 */
export const restoreWindow = () => window.electronAPI.currentWindow.restore();

/**
  * 最小化应用窗口
  */
export const minimizeWindow = () => window.electronAPI.currentWindow.minimize();

/**
 * 判断应用窗口是否获得焦点
 * @returns 如果返回 `true` 则为是获得焦点，否则为不是获得焦点
 */
export const isWindowFocus = () => window.electronAPI.currentWindow.isFocused();

/**
 * 判断应用窗口是否处于打开状态
 * @returns 如果返回 `true` 则为是处于打开状态，否则为不是处于打开状态
 */
export const isWindowOpen = () => !window.electronAPI.currentWindow.isMinimized() && window.electronAPI.currentWindow.isVisible();

/**
 * 判断应用窗口是否处于打开且获得焦点状态
 * @returns 如果返回 `true` 则为是处于打开且获得焦点状态，否则为不是处于打开且获得焦点状态
 */
export const isWindowOpenAndFocus = () => window.electronAPI.currentWindow.isFocused() && !window.electronAPI.currentWindow.isMinimized() && window.electronAPI.currentWindow.isVisible();

/**
 * 判断应用窗口是否处可见
 * @returns 如果返回 `true` 则为是处可见，否则为不是处可见
 */
export const isWindowVisible = () => window.electronAPI.currentWindow.isVisible();

/**
 * 兼容 macOS 上双击标题栏最小化窗口或缩放窗口功能
 * @see https://github.com/electron/electron/issues/16385
 * @see https://github.com/foxglove/studio/pull/28/commits/97e20154fb28d775e21c1abde148c3734062bba8
*/
export async function handleTitlebarDblClick() {
    if (!env.isOSX) {
        return;
    }
    const doubleClickAction = await window.electronAPI.getUserDefault('AppleActionOnDoubleClick', 'string');
    if (doubleClickAction === 'Minimize') {
        window.electronAPI.currentWindow.minimize();
    } else if (doubleClickAction === 'Maximize') {
        if (!window.electronAPI.currentWindow.isMaximized()) {
            window.electronAPI.currentWindow.maximize();
        } else {
            window.electronAPI.currentWindow.unmaximize();
        }
    }
}

/**
 * 设置窗口标题
 * @param title 窗口标题
 */
export const setWindowTitle = (title: string) => {
    window.electronAPI.currentWindow.setTitle(title);
};

/**
 * 获取窗口状态控制器
 * @returns 窗口状态控制器对象
 */
export function getWindowStateController() {
    return {
        showWindowControls: !env.isOSX,
        closeWindow,
        toggleWindowMaximized,
        minimizeWindow,
        isWindowMaximized,
        onWindowMaximizedChanged,
        offWindowMaximizedChanged,
        handleTitlebarDblClick,
    };
}

export type WindowStateController = ReturnType<typeof getWindowStateController>;
