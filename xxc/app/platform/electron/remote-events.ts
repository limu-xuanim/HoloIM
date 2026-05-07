/** 主进程请求变更语言事件（renderer → main） */
export const EVENT_APP_LANG_CHANGE = 'app.lang.change';

/** 请求在渲染进程打开 URL（main → renderer） */
export const EVENT_APP_OPEN_URL = 'app.openUrl';

/** 当有子窗口关闭时（main → renderer） */
export const EVENT_CHILD_WINDOW_CLOSED = 'app.childWindow.closed';

/** 主进程请求即将关闭窗口事件（main → renderer） */
export const EVENT_WINDOW_WILL_CLOSE = 'app.window.willClose';

/** 主进程请求渲染进程执行性能测试事 */
export const PERF_MESSAGE  = 'perf_message';

export const WEBVIEW_NEW_WINDOW = 'webview-new-window';

/**
 * 窗口事件
 */
export enum BROWSER_WINDOW_EVENT {
    FOCUS = 'BrowserWindow:event:focus',
    BLUR = 'BrowserWindow:event:blur',
    MINIMIZE = 'BrowserWindow:event:minimize',
    MAXIMIZE = 'BrowserWindow:event:maximize',
    UNMAXIMIZE = 'BrowserWindow:event:unmaximize',
    SHOW = 'BrowserWindow:event:show',
    RESTORE = 'BrowserWindow:event:restore',
    LEAVE_FULL_SCREEN = 'BrowserWindow:event:leave-full-screen',
};

/**
 * 请求从托盘打开应用窗口
 */
export const REQUEST_OPEN_FROM_TRAY = 'requestOpenFromTray';
