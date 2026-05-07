import {dialog} from 'electron';
import type {WindowType} from '../constants';
import {AppBaseWindow} from './app-base-window';
import Lang from './lang';

/**
 * 通过子窗口页面地址获取名称和类型
 * @param url Electron 子窗口页面地址
 * @returns 名称和类型信息对象
 */
function getNameTypeFromUrl(url: string) {
    const {searchParams} = new URL(url);
    const name = searchParams.get('WIN_NAME');
    const type = searchParams.get('ENTRY') as ValueOf<typeof WindowType>;
    if (!name || !type) {
        throw new Error(`Invalid url: ${url}`);
    }
    return {name, type};
}

export type AppChildWindowDetails = Electron.DidCreateWindowDetails & Partial<{
    options: Partial<{
        closeConfirm: boolean;
        overlayIcon: string;
        maximize: boolean;
        closeConfirmLabel: string;
        resizable: boolean;
    }>
}>;

/**
 * 子窗口
 */
export class AppChildWindow extends AppBaseWindow {
    /** Electron 子窗口创建信息 */
    readonly details: Electron.DidCreateWindowDetails;

    /**
     * 创建该子窗口的主窗口名称，即 AppWindow.name
     */
    public readonly parentWinName: string;

    private closeConfirm = false;

    /**
     * 创建一个子窗口管理对象
     * @param browserWindow Electron 窗口管理对象
     * @param details Electron 子窗口创建信息
     */
    constructor(parentWinName: string, browserWindow: Electron.BrowserWindow, details: AppChildWindowDetails) {
        const {closeConfirm = false, overlayIcon, maximize, closeConfirmLabel = 'common.closeWindowConfirm', resizable = true} = details.options;
        super(browserWindow, {
            ...getNameTypeFromUrl(details.url),
            closeConfirm,
            overlayIcon,
            maximize,
            closeConfirmLabel,
        });

        this.parentWinName = parentWinName;

        if (details.options.center) {
            browserWindow.center();
        }
        if (details.options.title) {
            browserWindow.setTitle(details.options.title);
        }

        this.details = details;

        this.closeConfirm = closeConfirm;

        if (resizable === false) {
            browserWindow.setResizable(resizable);
        }
    }

    /**
     * 处理 Electron 窗口 close 事件
     * @param event 事件对象
     */
    handleWindowClose(event: Electron.Event) {
        const {onClose} = this.options;

        if (DEBUG) {
            console.log(`>> AppBaseWindow[${this.name}]: close, reason=${this.closeReason}, closed=${this.closed}, closeConfirm=${this.closeConfirm}`);
        }

        // 如果已经标记为关闭，则直接关闭
        if (this.closed || !this.browserWindow) {
            return;
        }

        if (onClose) {
            onClose(event, this.closeReason, this);
        }

        if (!this.closeConfirm) {
            return;
        }

        event.preventDefault();

        dialog.showMessageBox(this.browserWindow, {
            buttons: [Lang.string('common.confirm', '确定'), Lang.string('common.cancel', '取消')],
            defaultId: 0,
            type: 'question',
            message: Lang.string(this.options.closeConfirmLabel as 'common.closeWindowConfirm')
        }).then(({response}) => {
            if (response === 0) {
                this.closeConfirm = false;
                this.close();
            }
        }).catch(error => {
            if (DEBUG) {
                console.log(`>> AppBaseWindow[${this.name}]: error when show close message box: `, error);
            }
        });
    }
}
