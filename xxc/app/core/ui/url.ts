import {WEBVIEW_NEW_WINDOW} from '~/app/platform/electron/remote-events';
import {isWebUrl, isLocalUrl} from '../../utils/html-helper';
import {executeCommandLine} from '../commander';
import {isMainWindow} from '~/app/window-bridge/common';
import platform from '~/app/platform';
import type {ElectronPlatform} from '~/app/platform/electron';
import {HElm} from '~/app/utils/react-helper';

const platformUI = platform.access<ElectronPlatform['ui']>('ui');

/**
 * 在系统默认浏览器中打开链接
 * @param url 要打开的链接
 */
export const openUrlInBrowser = (url: string) => platformUI.openExternal(url);

/**
 * 根据界面事件打开链接，自动选择打开的方式
 * @param url 要打开的链接
 * @param targetElement 触发事件元素
 * @param event 界面事件对象
 * @param context 命令参数
 * @returns 如果返回 `true` 则打开成功，否则为打开失败
 */
export const openUrl = async (url: string, targetElement?: Element, event?: Event, context?: any): Promise<boolean> => {
    if (!url) {
        return false;
    }

    if (!isMainWindow()) {
        // 暂时禁用非主窗口中的 @成员弹窗
        if (/^@#\d+$/.test(url)) {
            return false;
        }
        return window.chathistoryAPI.openUrl(url, targetElement, event, context);
    }

    if (/^@#\d+$/.test(url)) {
        executeCommandLine(`showContextMenu/member.profile/${url.substring(1)}`, {targetElement, event, ...context});
    }

    if (DEBUG) {
        console.collapse('Open Url', 'redBg', url, 'redPale');
        console.log('targetElement', targetElement);
        console.log('event', event);
        console.log('context', context);
        console.groupEnd();
    }
    if (isWebUrl(url) || isLocalUrl(url)) {
        openUrlInBrowser(url);
        return true;
    }

    const firstChar = url[0];
    if (firstChar === '!' || firstChar === '|' || url.startsWith('xxc:')) {

        url = url.substr((firstChar === '!' || firstChar === '|') ? 1 : (url.startsWith('xxc://') ? 6 : 4));
        executeCommandLine(url, {targetElement, event, ...context});
        return true;
    }
    if ((firstChar === '#' && !url.startsWith('#/')) || firstChar === '@') {
        return true;
    }
};

/**
 * 在扩展应用中功能打开链接
 * @param url 要打开的地址
 * @param appName 应用名称
 * @param redirectConfirm 是否在跳转前让用户确认
 */
export const openUrlInApp = (url: string, appName: string, redirectConfirm: 'true' | 'false' | boolean) => {
    executeCommandLine(`openInApp/${appName}/${encodeURIComponent(url)}/${redirectConfirm ? encodeURIComponent(redirectConfirm) : ''}`, {appName, url, redirectConfirm});
};

/**
 * 检查给定 HTML 元素是否包含链接
 * @param target HTML 元素
 * @returns 布尔值结果
 */
const containLink = (target: HTMLElement) => target.classList.contains('app-link') || (target instanceof HTMLAnchorElement && (target as HTMLAnchorElement).href);

/**
 * 监听页面上的点击事件
 */
function initDocumentClickListener() {
    document.addEventListener('click', e => {
        let target = HElm(e.target);
        while (target && !containLink(target)) {
            target = target.parentElement;
        }

        if (!target || !(target instanceof HTMLAnchorElement)) {
            return;
        }

        if (target.hasAttribute('href') && target.attributes.getNamedItem('href')?.value.startsWith('#/')) {
            return;
        }

        const url = target.attributes.getNamedItem('href')?.value || target.dataset.url;
        if (!url) {
            return;
        }

        openUrl(url, target, e);
        e.preventDefault();
    });
}

initDocumentClickListener();

if (window.electronAPI) {
    window.electronAPI.ipcRenderer.on[WEBVIEW_NEW_WINDOW]((_event, _wcId, detials) => {
        if (detials.url?.includes('xxc://')) {
            openUrl(detials.url);
            return;
        }

        try {
            window.electronAPI.shellOpenExternal(detials.url);
        } catch (error) {
            console.error(error);
        }
    });
}
