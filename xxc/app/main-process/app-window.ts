import {app, BrowserWindow, dialog} from 'electron';
import {URLSearchParams} from 'node:url';
import {IS_LINUX, IS_MAC_OSX, IS_WINDOWS_OS} from './env';
import {EVENT_APP_OPEN_URL, EVENT_WINDOW_WILL_CLOSE} from '../platform/electron/remote-events';
import Lang from './lang';
import electronConfig from './config';
import {AppChildWindow} from './app-child-window';
import {AppBaseWindow} from './app-base-window';
import path from 'node:path';
import type {AppBaseWindowOptions} from './app-base-window';
import type {WindowType} from '../constants';

// macOS系统下退出判断（https://stackoverflow.com/questions/35008347/electron-close-w-x-vs-right-click-dock-and-quit）
let isQuittingOnMac = false;
if (IS_MAC_OSX) {
    app.on('before-quit', () => {
        isQuittingOnMac = true;
    });
}

/**
 * 构建应用窗口入口页面地址
 * @param originUrl 原始地址
 * @param options 其他选项
 * @param options.params URL 额外参数
 * @param options.hash Url Hash 信息
 * @returns 应用窗口入口页面地址
 */
function buildBrowserWindowUrl(originUrl: string, options: {params?: string|Record<string, string>, hash?: string} = {}): string {
    const {params, hash} = options;
    let url = originUrl;
    if (!url.startsWith('file://') && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = `file://${app.getAppPath()}/${url}`;
    }
    if (process.env.REACT_PERF) {
        url += url.includes('?') ? '&react_perf' : '?react_perf';
    }
    if (process.env.BROWSER_URL_PARAMS) {
        url += (url.includes('?') ? '&' : '?') + process.env.BROWSER_URL_PARAMS;
    }
    if (params) {
        let paramsString = params;
        if (typeof params === 'object') {
            // 此代码运行在 main process，所以没有引入 app/utils/html-helper.ts 中的 stringifySearchParams
            const searchParams = Object.entries(params)
                .reduce((urlParams, [key, value]) => {
                    urlParams.append(key, value);
                    return urlParams;
                }, new URLSearchParams());

            paramsString = searchParams.toString();
        }
        url += (url.includes('?') ? '&' : '?') + paramsString;
    }
    if (hash) {
        url += `#${hash}`;
    }
    return url;
}

export type AppWindowOptions = AppBaseWindowOptions & Partial<{
    url: string;
    show: boolean|'onLoad';
    urlParams: string;
    hashRoute: string;
    preventNavigate: boolean;
    preventUnload: boolean;
    closeConfirm: string|boolean;
    editableContextMenu: string|boolean;
    onChildClosed: (window: AppChildWindow) => void;
    onShow: (window: AppWindow) => void;
    onLoad: (window: AppWindow) => void;
    trayBuilder: ((window: AppWindow) => {
        tray: Electron.Tray;
        icons: {
            normalTray: Electron.NativeImage;
            blankTray: Electron.NativeImage;
            grayTray: Electron.NativeImage;
        }
    });
    webPreferences: Electron.WebPreferences;
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
    x: number;
    y: number;
}>;

/**
 * Electron 窗口管理类
 */
export class AppWindow extends AppBaseWindow {
    /** 托盘图标构造方式 */
    private trayBuilder: ((window: AppWindow) => {tray: Electron.Tray, icons: {normalTray: Electron.NativeImage; blankTray: Electron.NativeImage; grayTray: Electron.NativeImage;}})|'default';

    /** 托盘图标闪烁计数器 */
    private trayIconCounter = 0;

    /** 托盘图标闪烁时交替使用的可用图片地址 */
    private trayIcons: {normalTray: Electron.NativeImage; blankTray: Electron.NativeImage; grayTray: Electron.NativeImage;};

    /** 托盘图标管理对象 */
    private tray: Electron.Tray | null = null;

    private trayFlashTimer: NodeJS.Timeout | null = null;

    /** 子窗口 */
    private readonly childWindows = new Map<string, AppChildWindow>();

    /**
     * 当前窗口打开的所有子窗口
     */
    get allChildWindows() {
        return Array.from(this.childWindows.values());
    }

    /**
     * 创建一个应用窗口
     * @param options 创建创建选项
     * @param options.type 应用窗口类型
     * @param options.show 是否在窗口后或加载后显示
     * @param options.urlParams 额外的 URL 查询参数
     * @param options.hashRoute URL Hash 路由地址
     * @param options.url 要加载的地址
     * @param options.preventNavigate 阻止导航到其他页面
     * @param options.preventUnload 阻止页面 unload
     * @param options.closeConfirm 是否在关闭窗口时询问用户，此选项可以指定为询问用户时的文本
     * @param options.editableContextMenu 是否为可编辑内容启用通用右键菜单，例如复制粘贴等
     * @param options.trayBuilder 托盘图标构造方式，如果为 true 则自动根据窗口类型维护托盘图标，也可以指定一个函数来创建托盘图标
     * @param options.onClose 窗口将关闭时的回调函数
     * @param options.onClosed 窗口被关闭时的回调函数
     * @param options.onChildClosed 子窗口被关闭时的回调函数
     * @param options.onShow 窗口显示时的回调函数
     * @param options.onFocus 窗口获得焦点时的回调函数
     * @param options.onLoad 窗口页面首次加载完成时的回调函数
     */
    constructor(options: AppWindowOptions) {
        const {
            type = 'main',
            show = 'onLoad',
            url = `index.html?ENTRY={type}&WIN_NAME={name}&PARENT_WIN_NAME=${''}&HOT=${process.env.HOT || ''}&HOT_SERVER=${process.env.HOT_SERVER || ''}&HTTPS=${process.env.HTTPS || ''}`,
            urlParams,
            hashRoute,
            preventNavigate = true,
            preventUnload = true,
            onClose,
            onClosed,
            onChildClosed,
            onShow,
            onFocus,
            onLoad,
            trayBuilder,
            webPreferences,
            ...otherBrowserWindowOptions
        } = options;

        /**
         * Electron 应用窗口构建选项
         */
        const browserWindowOptions: Electron.BrowserWindowConstructorOptions = {
            show: show === true,
            autoHideMenuBar: !IS_MAC_OSX,
            backgroundColor: IS_MAC_OSX ? undefined : '#ffffff',
            visualEffectState: DEBUG ? 'active' : 'followWindow',
            webPreferences: {
                webSecurity: false,
                nodeIntegration: true,
                webviewTag: true,
                zoomFactor: 1,
                contextIsolation: true,
                preload: path.resolve(app.getAppPath(), './dist/preload.js'),
                backgroundThrottling: type !== 'main',
                ...webPreferences,
            },
            width: 1280,
            height: 800,
            minWidth: 748,
            minHeight: 510,
            titleBarStyle: IS_MAC_OSX ? 'hidden' : undefined,
            frame: false,
            ...(IS_LINUX ? {
                // 有些 Linux 系统初次启动拿不到 App 本身的图标，所以在此进行单独的设置，保证窗口在任务栏具有图标
                // TODO(catouse): 测试 Linux 下图标是否正确
                icon: `${app.getAppPath()}/resources/icon-modern.png`,
            } : {}),
            ...otherBrowserWindowOptions
        };

        /** Electron 应用窗口对象 */
        const browserWindow = new BrowserWindow(browserWindowOptions);

        super(browserWindow, {
            closeConfirm: false,
            ...options,
            type: type as ValueOf<typeof WindowType>,
            name: `${type}-${browserWindow.id}`
        });

        this.trayBuilder = trayBuilder;

        browserWindow.once('ready-to-show', () => {
            if (DEBUG) {
                console.log(`>> AppWindow[${this.name}]: ready to show`);
            }

            PERF_MARK('appReadyToShow', 'appCreateWindow', 'firstRenderFinishTime');
            browserWindow.webContents.zoomFactor = 1;
        });

        browserWindow.once('show', () => {
            if (DEBUG) {
                console.log(`>> AppWindow[${this.name}]: first show`);
            }

            if (onShow) {
                onShow(this);
            }
            if (PERF) {
                PERF_MARK('appShowWindow', 'appCreateWindow', 'createWindowTime');
            }
        });

        browserWindow.webContents.on('did-finish-load', () => {
            if (DEBUG) {
                console.log(`>> AppWindow[${this.name}]: did finish load`);
            }

            PERF_MARK('appFinishLoad', 'appShowWindow', 'windowLoadedTime');

            if (show === 'onLoad') {
                browserWindow.show();
                browserWindow.focus();
            }
            if (onLoad) {
                onLoad(this);
            }
        });

        // 阻止应用尝试阻止 unload 的行为
        if (preventUnload) {
            browserWindow.webContents.on('will-prevent-unload', (event) => {
                event.preventDefault();
            });
        }

        // 阻止应用窗口导航到其他地址
        if (preventNavigate) {
            browserWindow.webContents.on('will-navigate', event => event.preventDefault());
        }

        // 阻止应用内的链接打开新窗口
        browserWindow.webContents.setWindowOpenHandler((detail) => {
            if (DEBUG) {
                console.log(`>> AppWindow[${this.name}]: will open window`, detail);
            }

            // chrome中 使用 shift + 左键打开超链接会在新窗口中打开
            if (detail.url.includes('ENTRY=main')) {
                return {action: 'deny'};
            }

            if (detail.disposition === 'new-window') {
                let openUrl = detail.url.replace(/\\/g, '/');
                if (IS_WINDOWS_OS && openUrl.startsWith('file:///')) {
                    openUrl = openUrl.replace('file:///', 'file://');
                }
                if (openUrl.startsWith(encodeURI(`file://${app.getAppPath().replace(/\\/g, '/')}/`))) {
                    return {
                        action: 'allow',
                        overrideBrowserWindowOptions: {
                            center: true,
                            closeConfirm: detail.features.includes('closeConfirm=true'),
                            autoHideMenuBar: !IS_MAC_OSX,
                            backgroundColor: IS_MAC_OSX ? null : '#ffffff',
                            visualEffectState: DEBUG ? 'active' : 'followWindow',
                            webPreferences: {
                                webSecurity: false,
                                webviewTag: true,
                                zoomFactor: 1,
                                contextIsolation: true,
                                preload: path.resolve(app.getAppPath(), './dist/preload.js'),
                            },
                            titleBarStyle: IS_MAC_OSX ? 'hidden' : null,
                            frame: false,
                            ...(IS_LINUX ? {
                                // 有些 Linux 系统初次启动拿不到 App 本身的图标，所以在此进行单独的设置，保证窗口在任务栏具有图标
                                // TODO(catouse): 测试 Linux 下图标是否正确
                                icon: `${app.getAppPath()}/resources/icon-modern.png`,
                            } : {}),
                        }
                    };
                }
            }
            if (detail.disposition === 'foreground-tab') {
                browserWindow.webContents.send(EVENT_APP_OPEN_URL, detail.url);
            }
            return {action: 'deny'};
        });

        browserWindow.webContents.on('did-create-window', (childBrowserWindow, details) => {
            const childWindow = new AppChildWindow(this.name, childBrowserWindow, details);

            if (!childWindow.name) {
                throw new Error('AppChildWindow name is undefined');
            }

            if (DEBUG) {
                console.log(`>> AppWindow[${this.name}]: created child window`, childWindow.name, details);
            }

            this.childWindows.set(childWindow.name, childWindow);
            childBrowserWindow.on('closed', () => {
                this.childWindows.delete(childWindow.name);
                if (onChildClosed) {
                    onChildClosed(childWindow);
                }
                // 子窗口关闭清除OverlayIcon角标设置
                browserWindow.setOverlayIcon(null, 'handleWindowClose');
            });
        });

        // 加载页面
        if (url) {
            const initialUrl = buildBrowserWindowUrl(url, {params: urlParams, hash: hashRoute});
            browserWindow.loadURL(initialUrl.replace('{type}', type).replace('{name}', this.name));
        }
    }

    /**
     * 根据窗口名称获取子窗口
     * @param name 窗口名称
     * @returns 子窗口对象
     */
    getChildWindow(name: string) {
        return this.childWindows.get(name);
    }

    /**
     * 关闭所有子窗口
     */
    closeAllChildWindows() {
        for (const childWin of this.childWindows.values()) {
            childWin.closeAndDestroy();
        }
        this.childWindows.clear();
    }

    /**
     * 强制关闭窗口
     * @override
     */
    override closeAndDestroy() {
        super.closeAndDestroy();
        this.closeAllChildWindows();
    }

    /**
     * 销毁托盘图标
     * @returns 如果操作成功返回 true
     */
    destroyTray(): boolean {
        if (!this.tray) {
            return false;
        }

        this.flashTray(false);
        this.tray.destroy();
        this.tray = null;

        if (DEBUG) {
            console.log(`>> AppWindow[${this.name}]: destroy tray`);
        }
        return true;
    }

    /**
     * 构建托盘图标
     * @returns 如果操作成功返回 托盘图标管理对象
     */
    buildTray(): boolean {
        this.destroyTray();

        if (typeof this.trayBuilder !== 'function') {
            return false;
        }

        const {tray, icons} = this.trayBuilder(this);
        this.tray = tray;
        this.trayIcons = icons;
        this.trayIconCounter = 0;

        if (DEBUG) {
            console.log(`>> AppWindow[${this.name}]: build tray`);
        }

        return true;
    }

    /**
     * 闪烁托盘图标
     * @param flash 如果设置为 `true` 则闪烁图标；如果设置为 `false` 则取消闪烁图标
     */
    flashTray(flash = true) {
        if (flash && this.tray) {
            if (!this.trayFlashTimer) {
                this.trayFlashTimer = setInterval(() => {
                    if (this.tray) {
                        this.tray.setImage(this.trayIcons[(this.trayIconCounter++) % 2 === 0 ? 'normalTray' : 'blankTray']);
                    } else {
                        this.flashTray(false);
                    }
                }, 400);
            }
        } else {
            if (this.trayFlashTimer) {
                clearInterval(this.trayFlashTimer);
                this.trayFlashTimer = null;
            }
            this.tray?.setImage(this.trayIcons.normalTray);
        }

        if (DEBUG) {
            console.log(`>> AppWindow[${this.name}]: flash tray(${flash})`);
        }
    }

    /**
     * 托盘图标变灰色(MacOS下为在托盘旁边添加离线文字提示)
     * @param setGray 如果设置为 `true` 则托盘图标变灰；如果设置为 `false` 则托盘图标恢复正常
     */
    setTrayToGray(setGray = true) {
        if (this.tray) {
            if (IS_MAC_OSX) {
                if (setGray) {
                    this.setTrayTitle('已离线');
                } else {
                    this.setTrayTitle('');
                }
                return;
            }
            if (setGray) {
                this.tray.setImage(this.trayIcons.grayTray);
            } else {
                this.tray.setImage(this.trayIcons.normalTray);
            }
        }
    }

    /**
     * 设置托盘图标标题
     * @param title 标题
     */
    setTrayTitle(title = '') {
        this.tray?.setTitle(title);

        if (DEBUG) {
            console.log(`>> AppWindow[${this.name}]: set tray title`, title);
        }
    }

    /**
     * 设置托盘图标悬停提示文本
     * @param tooltip 悬停提示文本
     */
    setTrayTooltip(tooltip = Lang.string('app.title', electronConfig.pkg.displayName)) {
        this.tray?.setToolTip(tooltip);

        if (DEBUG) {
            console.log(`>> AppWindow[${this.name}]: set tray tooltip`, tooltip);
        }
    }

    /**
     * 处理 Electron 窗口 close 事件
     * @param event 事件对象
     * @override
     */
    async handleWindowClose(event: Electron.Event) {
        const {onClose, closeConfirm = false} = this.options;

        if (DEBUG) {
            console.log(`>> AppWindow[${this.name}]: close, reason=${this.closeReason}, closed=${this.closed}, closeConfirm=${closeConfirm}`);
        }

        // 在性能测试模式下，允许直接关闭窗口
        if (process.env.PERF) {
            this.closed = true;
            return;
        }

        // 如果已经标记为关闭，则直接关闭
        if (this.closed) {
            return;
        }

        if (onClose) {
            onClose(event, this.closeReason, this);
        }

        // 如果此窗口关闭不需要确认，则直接关闭
        if (!closeConfirm) {
            this.closed = true;
            return;
        }

        event.preventDefault();

        const now = Date.now();
        if ((now - this.lastRequestCloseTime) < 1000) {
            // 如果用户在 1 秒内连续点击两次关闭，则询问用户是否立即退出
            const {response} = await dialog.showMessageBox(this.browserWindow!, {
                buttons: [Lang.string('common.exitIM', '立即退出'), Lang.string('common.cancel', '取消')],
                defaultId: 0,
                type: 'question',
                message: Lang.string('common.confirmQuitIM', '确定要退出吗？')
            });
            if (response === 0) {
                setTimeout(this.closeAndDestroy.bind(this), 0);
            }
        } else if (typeof closeConfirm === 'string') {
            const {response} = await dialog.showMessageBox(this.browserWindow!, {
                buttons: [Lang.string('common.close', '关闭'), Lang.string('common.cancel', '取消')],
                defaultId: 0,
                type: 'question',
                message: Lang.string('common.closeWindowConfirm', '确定要关闭窗口吗？')
            });
            if (response === 0) {
                setTimeout(this.closeAndDestroy.bind(this), 0);
            }
        } else {
            // 记录请求关闭的时间
            this.lastRequestCloseTime = now;

            // 向渲染进程发送消息确认是否关闭
            this.sendToRenderer(EVENT_WINDOW_WILL_CLOSE, this.closeReason ?? 'close');
            this.closeReason = '';
        }
        if (isQuittingOnMac) {
            this.options.closeConfirm = false;
            app.quit();
        }
    }

    /**
     * 处理 Electron 窗口 closed 事件
     */
    override handleWindowClosed() {
        super.handleWindowClosed(() => {
            this.closeAllChildWindows();
            this.destroyTray();
        });
    }
}
