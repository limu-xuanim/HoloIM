import {Menu, dialog, clipboard, app, nativeImage, type WebContents} from 'electron';
import Lang from './lang';
import {EVENT_APP_LANG_CHANGE, BROWSER_WINDOW_EVENT, WEBVIEW_NEW_WINDOW} from '../platform/electron/remote-events';
import electronConfig from './config';
import {isNotEmptyString} from '../utils/check-empty';
import type {WindowType} from '~/app/constants';

const setWebviewContextMenuListener = (wc: WebContents) => {
    wc.on('context-menu', (_, props) => {
        const {x, y, isEditable, linkURL, pageURL, selectionText} = props;

        if (isNotEmptyString(selectionText)) {
            /** 文本输入框右键菜单 */
            Menu.buildFromTemplate([
                // {role: 'copy', label: Lang.string('menu.copy')},
                // {role: 'selectAll', label: Lang.string('menu.selectAll')}
                {label: Lang.string('menu.copy'), enabled: false},
                {label: Lang.string('menu.selectAll'), enabled: false}
            ]).popup();
            return;
        }

        // 添加编辑和选择菜单
        if (isEditable) {
            /** 文本输入框右键菜单 */
            Menu.buildFromTemplate([
                {role: 'undo', label: Lang.string('menu.undo')},
                // {role: 'redo', label: Lang.string('menu.redo')},
                {type: 'separator'},
                {role: 'cut', label: Lang.string('menu.cut')},
                {role: 'copy', label: Lang.string('menu.copy')},
                {role: 'paste', label: Lang.string('menu.paste')},
                {type: 'separator'},
                {role: 'selectAll', label: Lang.string('menu.selectAll')}
            ]).popup();
            return;
        }

        const template: Array<(Electron.MenuItemConstructorOptions) | (Electron.MenuItem)> = [];
        // 为 Webview 页面添加开发工具菜单
        if ((process.env.DEV_TOOLS && process.env.DEV_TOOLS !== '0') || DEBUG) {
            template.push(
                {label: `Webview: ${wc.getURL()}`, enabled: false},
                {label: Lang.string('debug.inspectElement'), click: () => wc.inspectElement(x, y)},
                {label: 'Open dev tools', click:() => wc.openDevTools({mode: 'detach'})}
            );
        }

        if (isNotEmptyString(linkURL)) {
            template.push({label: Lang.string('menu.copyLinkURL'), click: () => clipboard.writeText(linkURL)});
        }

        template.push({label: Lang.string('menu.copyPageURL'), click: () => clipboard.writeText(pageURL)});
        Menu.buildFromTemplate(template).popup();
    });
};

export type AppBaseWindowOptions = {
    type: ValueOf<typeof WindowType>;
    name: string;
} & Partial<{
    createTime: number;
    closeConfirm: boolean;
    editableContextMenu: boolean;
    selectableContextMenu: boolean;
    onFocus: (window: AppBaseWindow) => void;
    onClose: (event: Electron.Event, reason: string, window: AppBaseWindow) => void;
    onClosed: (window: AppBaseWindow) => void;
    overlayIcon: string;
    maximize: boolean;
    closeConfirmLabel: string;
}>;

/**
 * 应用窗口基础管理对象
 */
export abstract class AppBaseWindow {
    protected options: AppBaseWindowOptions;

    /** Electron 窗口管理对象 */
    #browserWindow: Electron.BrowserWindow | null = null;

    /** 窗口名称 */
    public readonly name: string;

    /** 窗口类型 */
    public readonly type: ValueOf<typeof WindowType>;

    /** 创建时间 */
    public readonly createTime: number;

    /** 上次激活的时间 */
    #focusTime: number;

    /** 是否已经被关闭 */
    protected closed = false;

    /** 上次请求关闭的时间 */
    protected lastRequestCloseTime = 0;

    /** 关闭原因 */
    protected closeReason = '';

    /**
     * 构造一个应用窗口基础管理对象
     * @param browserWindow Electron 窗口管理对象
     * @param options 其他选项
     * @param options.type 窗口类型
     * @param options.name 窗口名称
     * @param options.closeConfirm 关闭窗口前是否确认
     * @param options.editableContextMenu 是否为可编辑内容启用通用右键菜单，例如复制粘贴等
     * @param options.selectableContextMenu 是否为选中内容启用通用右键菜单，例如复制等
     * @param options.onFocus 被激活时的回调函数
     * @param options.onClose 请求关闭时的回调函数
     * @param options.onClosed 被关闭时的回调函数
     * @param options.overlayIcon 窗口任务栏图标的角标
     */
    constructor(browserWindow: Electron.BrowserWindow, options: AppBaseWindowOptions) {
        const {name, type, editableContextMenu = true, selectableContextMenu = true, createTime = Date.now(), maximize = false} = options;
        this.options = options;
        this.#browserWindow = browserWindow;
        this.name = name;
        this.type = type;
        this.createTime = createTime;
        this.#focusTime = Date.now();
        this.bindEventListeners({
            editableContextMenu,
            selectableContextMenu
        });
        if (maximize) {
            browserWindow.maximize();
        }
    }
    /** Electron 窗口对象 */
    get browserWindow() {
        return this.#browserWindow;
    }

    /** 上次激活的时间 */
    get focusTime() {
        return this.#focusTime;
    }

    abstract handleWindowClose(event: Electron.Event): void;

    bindEventListeners(options: {editableContextMenu: boolean; selectableContextMenu: boolean;}) {
        const {editableContextMenu, selectableContextMenu} = options;
        const browserWindow = this.browserWindow;
        if (!browserWindow) {
            return;
        }

        browserWindow.on('show', () => {
            browserWindow.webContents.send(BROWSER_WINDOW_EVENT.SHOW);
        });
        browserWindow.on('focus', () => {
            browserWindow.webContents.send(BROWSER_WINDOW_EVENT.FOCUS);
            this.handleWindowFocus();
        });
        browserWindow.on('blur', () => {
            browserWindow.webContents.send(BROWSER_WINDOW_EVENT.BLUR);
        });
        browserWindow.on('closed', () => this.handleWindowClosed());
        browserWindow.on('close', this.handleWindowClose.bind(this));
        browserWindow.on('restore', () => {
            browserWindow.webContents.send(BROWSER_WINDOW_EVENT.RESTORE);
        });
        browserWindow.on('minimize', () => {
            browserWindow.webContents.send(BROWSER_WINDOW_EVENT.MINIMIZE);
        });
        browserWindow.on('maximize', () => {
            browserWindow.webContents.send(BROWSER_WINDOW_EVENT.MAXIMIZE);
        });
        browserWindow.on('unmaximize', () => {
            browserWindow.webContents.send(BROWSER_WINDOW_EVENT.UNMAXIMIZE);
        });
        browserWindow.on('leave-full-screen', () => {
            browserWindow.webContents.send(BROWSER_WINDOW_EVENT.LEAVE_FULL_SCREEN);
        });

        browserWindow.webContents.on('did-attach-webview', (_event, wc) => {
            wc.setWindowOpenHandler((details) => {
                browserWindow.webContents.send(WEBVIEW_NEW_WINDOW, wc.id, details);
                return  {action: 'deny'};
            });

            setWebviewContextMenuListener(wc);
        });

        // 为可编辑内容启用通用右键菜单
        if (editableContextMenu || selectableContextMenu) {
            browserWindow.webContents.on('context-menu', (_e, props) => {
                if (DEBUG) {
                    console.log(`>> AppBaseWindow[${this.name}]: context-menu (isEditable=${props.isEditable}, selectionText=${props.selectionText}, selectableContextMenu=${selectableContextMenu}, editableContextMenu=${editableContextMenu})`);
                }
                if (editableContextMenu && props.isEditable) {
                    /** 文本输入框右键菜单 */
                    Menu.buildFromTemplate([
                        {role: 'undo', label: Lang.string('menu.undo')},
                        // {role: 'redo', label: Lang.string('menu.redo')},
                        {type: 'separator'},
                        {role: 'cut', label: Lang.string('menu.cut')},
                        {role: 'copy', label: Lang.string('menu.copy')},
                        {role: 'paste', label: Lang.string('menu.paste')},
                        {type: 'separator'},
                        {role: 'selectAll', label: Lang.string('menu.selectAll')}
                    ]).popup({window: browserWindow});
                } else if (selectableContextMenu && props.selectionText?.length) {
                    /** 文本输入框右键菜单 */
                    Menu.buildFromTemplate([
                        {role: 'copy', label: Lang.string('menu.copy')},
                        {role: 'selectAll', label: Lang.string('menu.selectAll')}
                    ]).popup({window: browserWindow});
                }
            });
        }

        if ((process.env.DEV_TOOLS && process.env.DEV_TOOLS !== '0') || DEBUG) {
            browserWindow.webContents.on('context-menu', (_, props) => {
                const {x, y, isEditable} = props;
                if (!isEditable) {
                    Menu.buildFromTemplate([{
                        enabled: false,
                        label: `Window: ${this.name}（${this.type}）`,
                    }, {
                        label: Lang.string('debug.inspectElement'),
                        click() {
                            browserWindow.webContents.inspectElement(x, y);
                        }
                    }, {
                        label: 'Open dev tools',
                        click() {
                            browserWindow.webContents.openDevTools({mode: 'detach'});
                        }
                    }, {
                        label: 'Copy URL',
                        toolTip: browserWindow.webContents.getURL(),
                        click() {
                            clipboard.writeText(browserWindow.webContents.getURL());
                        }
                    }]).popup({window: browserWindow});
                }
            });

            browserWindow.webContents.on('render-process-gone', (_e, detail) => {
                const messageBoxOptions: Electron.MessageBoxOptions = {
                    type: 'info',
                    title: 'Renderer process crashed.',
                    message: `The renderer process has been crashed, you can reload or close current window. There are more details: exitCode=${detail.exitCode}, reason=${detail.reason}.`,
                    buttons: ['Reload', 'Close']
                };
                if (DEBUG) {
                    console.error(`>> ERROR: ${messageBoxOptions.message}`, detail);
                }

                dialog.showMessageBox(messageBoxOptions).then(({response}) => {
                    if (response === 0) {
                        browserWindow.reload();
                    } else {
                        browserWindow.close();
                    }
                });
            });
        }
    }

    /** 关闭并销毁窗口 */
    closeAndDestroy() {
        if (DEBUG) {
            console.log(`>> AppBaseWindow[${this.name}]: force close`);
        }
        this.destroy();
    }

    /**
     * 关闭窗口
     * @param reason 关闭原因
     */
    close(reason: 'close'|'quit' = 'close') {
        this.closeReason = reason;
        this.browserWindow?.close();
    }

    /** 隐藏窗口 */
    hide() {
        this.browserWindow?.hide();
    }

    /** 销毁窗口 */
    destroy() {
        if (DEBUG) {
            console.log(`>> AppBaseWindow[${this.name}]: destroy`);
        }
        if (!this.browserWindow || this.browserWindow.isDestroyed()) {
            return;
        }
        this.closed = true;
        if (this.#browserWindow) {
            this.#browserWindow.destroy();
            this.#browserWindow = null;
        }
    }

    /**
     * 打开开发者工具
     * @param options 开发者工具选项
     */
    openDevTools(options: Omit<Electron.OpenDevToolsOptions, 'mode'> = {}) {
        this.browserWindow?.webContents.openDevTools({mode: (process.env.DEV_TOOLS_MODE as 'detach'|'right'|'bottom'|'undocked') || 'detach', ...options});
    }

    /**
     * 显示并激活窗口
     */
    showAndFocus() {
        if (DEBUG) {
            console.log(`>> AppBaseWindow[${this.name}]: show and focus`);
        }

        const {browserWindow} = this;
        if (!browserWindow || browserWindow.isDestroyed()) {
            return;
        }
        if (browserWindow.isMinimized()) {
            browserWindow.restore();
            browserWindow.focus();
            return;
        }
        if (browserWindow.isVisible()) {
            browserWindow.focus();
        } else {
            // Shows and gives focus to the window.
            browserWindow.show();
        }
    }

    /**
     * 发送消息到渲染进程
     * @param channel 消息通道名称
     * @param args 参数
     */
    sendToRenderer(channel: string, ...args: any[]) {
        try {
            this.browserWindow?.webContents.send(channel, ...args);
            if (DEBUG) {
                console.log(`>> AppBaseWindow[${this.name}]: send to renderer`, channel, args);
            }
        } catch (error) {
            if (DEBUG) {
                console.error(`>> AppBaseWindow[${this.name}]: failed sending to renderer`, channel, args);
            }
        }
    }

    /**
     * 通知渲染进程变更界面语言
     * @param langName 语言名称
     */
    changeLang(langName: string) {
        this.sendToRenderer(EVENT_APP_LANG_CHANGE, langName);
    }

    /**
     * 处理 Electron 窗口 closed 事件
     */
    handleWindowClosed(beforeCloseCallback?: () => void) {
        if (DEBUG) {
            console.log(`>> AppBaseWindow[${this.name}]: closed`);
        }

        beforeCloseCallback?.();
        this.closed = true;
        this.#browserWindow = null;
        this.options.onClosed?.(this);
    }

    /**
     * 处理 Electron 窗口 focus 事件
     */
    handleWindowFocus() {
        if (DEBUG) {
            console.log(`>> AppBaseWindow[${this.name}]: focus`);
        }

        if (!this.browserWindow) {
            return;
        }

        let {overlayIcon, onFocus} = this.options;
        if (overlayIcon) {
            if (!overlayIcon.includes('/')) {
                overlayIcon = `${app.getAppPath()}/${electronConfig.media['image.path']}${this.options.overlayIcon}`;
            }
            const overlayIconImage = nativeImage.createFromPath(overlayIcon);
            this.browserWindow.setOverlayIcon(overlayIconImage, this.name);
        }

        this.#focusTime = Date.now();
        onFocus?.(this);
    }
}
