// 本模块内的函数仅适用于主窗口

import {onUserLogout} from '../core/profile';
import {EVENT_CHILD_WINDOW_CLOSED} from '../platform/electron/remote-events';
import {isMainWindow} from './common';

const windowsMap = new Map<string, Window>();

/**
 * 获取子窗口
 * @param name 窗口名称
 */
const getChildWindow = (name: string) => {
    return windowsMap.get(name);
};

/**
 * 检查是否存在子窗口
 * @param name 窗口名称
 */
const hasChildWindow = (name: string) => {
    return !!getChildWindow(name);
};

/**
 * 删除子窗口
 * @param name 窗口名称
 * @returns 操作结果
 */
const deleteChildWindow = (name: string) => {
    return windowsMap.delete(name);
};

/**
 * 清除所有子窗口
 */
const clearChildWindow = () => {
    windowsMap.clear();
};

/**
 * 设置子窗口
 * @param name 窗口名称
 * @param win window 对象
 */
const setChildWindow = (name: string, win: Window) => {
    windowsMap.set(name, win);
};

/**
 * 获取全部子窗口
 */
const getAllChildWindow = () => {
    return Array.from(windowsMap.values());
};

/**
 * 关闭并移除所有的子窗口
 */
const destroyAndRemoveAllChildWindows = () => {
    const allChildWindows = window.$getAllChildWindow();
    for (const childWindow of allChildWindows) {
        childWindow.electronAPI.currentWindow.destroy();
    }

    window.$clearChildWindow();
}

/**
 * 绑定操作子窗口事件
 */
const handleChildWindowEvent = () => {
    // 监听子窗口关闭事件
    window.electronAPI?.ipcRenderer.on[EVENT_CHILD_WINDOW_CLOSED]((_, name: string) => {
        if (DEBUG) {
            console.collapse('EVENT_CHILD_WINDOW_CLOSE', 'redBg', name, 'redPale');
            console.log('childWindowName', name);
            console.log('event', _);
            console.groupEnd();
        }

        window.$deleteChildWindow(name);
        const apiName = name.replace('__id__', 'API_');
        if (apiName in window) {
            delete window[apiName as keyof typeof window];
        }
    });

    const logoutSubscription = onUserLogout(([_user, _code, _reason, unexpected]) => {
        if (!unexpected) {
            destroyAndRemoveAllChildWindows();
        }
    });
    window.addEventListener('beforeunload', () => {
        destroyAndRemoveAllChildWindows();
        logoutSubscription.unsubscribe();
    });
};

/**
 * 初始化主窗口
 */
export const initMainWindow = () => {
    window.$getChildWindow = getChildWindow;
    window.$setChildWindow = setChildWindow;
    window.$hasChildWindow = hasChildWindow;
    window.$deleteChildWindow = deleteChildWindow;
    window.$clearChildWindow = clearChildWindow;
    window.$getAllChildWindow = getAllChildWindow;

    handleChildWindowEvent();
};

if (!isMainWindow()) {
    throw new Error('Cant use app/window-bridge/main.ts in child window!');
}

declare global {
    interface Window {
        $getChildWindow: (name: string) => Window | undefined;
        $setChildWindow: (name: string, win: Window) => void;
        $hasChildWindow: (name: string) => boolean;
        $deleteChildWindow: (name: string) => boolean;
        $clearChildWindow: () => void;
        $getAllChildWindow: () => Window[];
    }
}
