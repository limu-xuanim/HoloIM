import {onUserLogout} from '~/app/core/profile';
import platform from '~/app/platform';
import Lang from '~/app/core/lang';
import {openUrl} from '~/app/core/ui/url';
import {exposeInWindow, openWindow, generateWindowFeatures, generateWindowUrl, getTargetWindow, getMainWindow} from '~/app/window-bridge/common';
import {WindowType} from '~/app/constants';
import type {CSSProperties} from 'react';

declare global {
    interface Window {
        webviewAPI: {
            lang: LangHelper;
            sourceUrl: string;
            favicon: string;
            title: string;
            theme: 'light' | 'dark' | 'auto';
            titleBarStyle: CSSProperties;
            webviewOptions: any;
            openUrl: (url: any, targetElement: any, event: any, context: any) => any;
        };
    }
}

type WebviewInfo = {
    id: string;
    source: string;
    title?: string;
    favicon?: string;
    options?: any;
    theme?: 'light' | 'dark' | 'auto';
    titleBarStyle?: CSSProperties;
};

/**
 * 使用系统浏览器打开 Webview 请求
 * @param webviewInfo Webview 信息对象
 * @returns 操作结果
 */
function openWebviewInExternal(webviewInfo: WebviewInfo) {
    const {source} = webviewInfo;
    const externalWindow = window.open(source);
    const logoutSubscription = onUserLogout(() => {
        externalWindow.close();
    });
    externalWindow.addEventListener('beforeunload', () => {
        logoutSubscription.unsubscribe();
    });
    return externalWindow;
}

/**
 * 打开 Webview 窗口
 * @param webviewInfo Webview 信息对象
 * @param webviewInfo.source Webview 地址或地址获取函数
 * @param webviewInfo.title Webview 标题
 * @param webviewInfo.favicon Webview Favicon
 * @param webviewInfo.windowOptions Webview 窗口选项
 * @param webviewInfo.theme 窗口主体
 * @param webviewInfo.titleBarStyle 窗口标题栏样式
 * @returns 操作结果
 */
export function openWebviewWindow(webviewInfo: WebviewInfo) {
    if (!platform.isElectron) {
        return openWebviewInExternal(webviewInfo);
    }

    const name = `webview__id__${webviewInfo.id}`;
    const existWin = getTargetWindow(name);
    if (existWin) {
        existWin.electronAPI.currentWindow.show();
        return existWin;
    }

    const url = generateWindowUrl(WindowType.webview, name);
    const features = generateWindowFeatures({
        title: `${Lang.string('file.preview')}${webviewInfo.title ? ` - ${webviewInfo.title}` : ''}`,
        minWidth: 1024,
        minHeight: 700,
        width: 1024,
        height: 700,
        overlayIcon: 'webview-win.png',
        maximize: true,
    });

    const win = openWindow(url, name, features);
    const mainWindow = getMainWindow();
    exposeInWindow(mainWindow, `webviewAPI_${webviewInfo.id}`, {
        lang: Lang,
        sourceUrl: webviewInfo.source,
        favicon: webviewInfo.favicon,
        title: webviewInfo.title,
        theme: webviewInfo.theme,
        titleBarStyle: webviewInfo.titleBarStyle,
        webviewOptions: webviewInfo.options,
        openUrl,
    });
    return win;
}
