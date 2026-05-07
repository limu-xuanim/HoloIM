import {app, dialog, Menu, Tray, nativeImage, globalShortcut, shell, screen, ipcMain, BrowserWindow, webContents} from 'electron';
import './log';
import {spawn} from 'node:child_process';
import Lang from './lang';
import electronConfig, {updateConfig} from './config';
import {IS_MAC_OSX, IS_WINDOWS_OS} from './env';
import {AppWindow} from './app-window';
import delay from '../utils/delay';

import {EVENT_CHILD_WINDOW_CLOSED, REQUEST_OPEN_FROM_TRAY} from '../platform/electron/remote-events';
import type {AppBaseWindow} from './app-base-window';
import {showInputContextMenu, showSelectionContextMenu} from './contextmenu';
import type {Language} from '../constants';

/**
 * 取消注册所有全局快捷键
 */
function unregisterGlobalShortcuts() {
    try {
        globalShortcut.unregisterAll();
    } catch (error) {
        if (DEBUG) {
            console.error('>> Unregiest global shortcut error', error);
        }
    }
}

export type Task = {
    file: string;
    args: string[];
    cwd: string;
    command: string;
};

/**
 * 执行命令后任务
 * @param task 任务信息对象
 * @param delayTime 执行后延迟等待的时间
 * @returns 异步返回结果
 */
async function spawnTask(task: Task, delayTime = 2000) {
    const taskProcess = IS_WINDOWS_OS
        ? spawn(task.file, task.args, {
            cwd: task.cwd,
            argv0: task.file,
            detached: true,
            windowsVerbatimArguments: true,
            windowsHide: !DEBUG,
            stdio: 'ignore'
        })
        : spawn(task.command, {
            shell: true,
            cwd: task.cwd,
            argv0: task.file,
            detached: true,
            windowsHide: !DEBUG,
            stdio: 'ignore'
        });
    if (delayTime) {
        await delay(delayTime);
    }
    taskProcess.unref();
}

/**
 * 喧喧应用管理类
 */
export default class XuanxuanApp {
    /**
     * 应用主窗口 Map，只有主窗口是 AppWindow，其他窗口都是 AppChildWindow
     */
    private appWindowMap = new Map<string, AppWindow>();

    /** 第一个主窗口是否就绪（UI 界面显示完成） */
    private firstMainWindowReady = false;

    /** Electron App 是否就绪 */
    private isReady = false;

    /**
     * 创建一个喧喧应用管理对象
     */
    constructor() {
        this.bindElectronEvents();
        this.bindIpcMainHandle();

        if (DEBUG) {
            console.log(`>> XuanxuanApp: created, app path is "${app.getAppPath()}".`);
        }
    }

    /**
     * 获取最后激活的窗口实例
     */
    get lastFocusedAppWin() {
        return this.getLastFocusedWindow();
    }

    /**
     * 获取最后激活的窗口实例
     * @param options 选项
     * @param options.includeChildWindow 是否包含子窗口
     * @param options.type 窗口类型
     * @returns 最后激活的窗口实例
     */
    private getLastFocusedWindow(options: {includeChildWindow?: boolean;} = {}) {
        const {includeChildWindow = false} = options;
        const appWindows = this.appWindowMap.values();
        let lastFocusedWindow: AppBaseWindow | null = null;
        for (const appWin of appWindows) {
            if (!lastFocusedWindow || appWin.focusTime > lastFocusedWindow.focusTime) {
                lastFocusedWindow = appWin;
            }
            if (includeChildWindow) {
                for (const childWin of appWin.allChildWindows) {
                    if (childWin.focusTime > lastFocusedWindow.focusTime) {
                        lastFocusedWindow = childWin;
                    }
                }
            }
        }
        return lastFocusedWindow!;
    }

    /**
     * 处理 Electron 应用就绪事件
     */
    public ready() {
        PERF_MARK('appReady');

        // 打开一个应用窗口，如果没有则创建一个
        this.openOrCreateWindow();

        // 创建程序坞图标右键菜单
        this.createDockMenu();

        // 创建应用窗口菜单
        this.buildAppMenu();

        this.isReady = true;

        PERF_MARK('appLaunched', 'appReady', 'appLaunchTime');

        if (DEBUG) {
            console.log('>> XuanxuanApp: ready.');
        }
    }

    /**
     * 处理渲染进程请求变更界面语言
     * @param winName 渲染进程窗口名称
     * @param langName 语言类型名称
     * @param langData 语言数据
     */
    private changeLang(winName: string, langName: ValueOf<typeof Language>, langData: Record<string, string>) {
        const langNameChanged = Lang.name !== langName;
        Lang.change(langName, langData);

        // 通知其他窗口变更界面语言
        if (langNameChanged) {
            const appWin = this.getAppWindow(winName);
            if (appWin) {
                appWin.changeLang(langName);
                for (const childWindow of appWin.allChildWindows) {
                    childWindow.changeLang(langName);
                }
            }
        }

        if (DEBUG) {
            console.log(`>> XuanxuanApp: change lang to ${langName}.`);
        }

        app.name = Lang.string('app.title', electronConfig.pkg.displayName);
        this.buildAppMenu();
        this.setAboutPanel();
        this.createDockMenu();
    }

    /**
     * 获取窗口管理对象
     * @param name 窗口名称
     * @returns 窗口管理对象
     */
    private getAppWindow(name: string): AppWindow | Nullish {
        return this.appWindowMap.get(name);
    }

    /**
     * 根据名称获取窗口或子窗口
     * @param triggerBrowserWindow 发出事件的主窗口
     * @param name 窗口或子窗口名称
     * @returns 窗口或子窗口对象
     */
    private getAppWindowOrChildWindow(triggerBrowserWindow: BrowserWindow, name: string): AppBaseWindow | Nullish {
        for (const theAppWin of this.appWindowMap.values()) {
            if (theAppWin.browserWindow !== triggerBrowserWindow) {
                continue;
            }
            if (theAppWin.name === name) return theAppWin;
            const childWindow = theAppWin.getChildWindow(name);
            if (childWindow) {
                return childWindow;
            }
        }
        return null;
    }

    /**
     * 创建一个应用窗口
     * @param options 创建创建选项
     * @param options.type 应用窗口类型
     * @param options.show 是否在窗口后或加载后显示
     * @param options.debug 是否开启 DEBUG 功能
     * @param options.urlParams 额外的 URL 查询参数
     * @param options.hashRoute URL Hash 路由地址
     * @param options.url 要加载的地址
     * @param options.preventNavigate 阻止导航到其他页面
     * @param options.preventUnload 阻止页面 unload
     * @param options.closeConfirm 是否在关闭窗口时询问用户，此选项可以指定为询问用户时的文本
     * @param options.editableContextMenu 是否为可编辑内容启用通用右键菜单，例如复制粘贴等
     * @returns 已创建的窗口名称
     */
    private createAppWindow(options: Omit<import('./app-window').AppWindowOptions, 'onClosed'|'onChildClosed'> = {}): string {
        const appWin = new AppWindow({
            ...options,
            onClosed: (win) => this.handleAppWindowClosed(win as AppWindow),
            onChildClosed: this.handleAppChildWindowClosed.bind(this),
        });
        this.appWindowMap.set(appWin.name, appWin);

        if (DEBUG) {
            console.log(`>> XuanxuanApp: create ${appWin.type} window "${appWin.name}".`);
        }

        return appWin.name;
    }

    /**
     * 创建一个主窗口
     * @returns 已创建的窗口名称
     */
    private createMainWindow() {
        const options: Parameters<typeof this.createAppWindow>[0] = {
            width: electronConfig.ui['app.windowDefaultWidth'] ?? 1000,
            height: electronConfig.ui['app.windowDefaultHeight'] ?? 750,
            minWidth: electronConfig.ui['app.windowMinWidth'] ?? 748,
            minHeight: electronConfig.ui['app.windowMinHeight'] ?? 510,
            show: process.argv.includes('--open-at-login') ? false : 'onLoad',
            closeConfirm: true,
            trayBuilder: this.buildMainWindowTray.bind(this),
            webPreferences: {
                webviewTag: true,
            }
        };

        // 为热更新模式打开开发者工具
        if (process.env.HOT) {
            const display = screen.getPrimaryDisplay();
            options.height = display.workAreaSize.height;
            options.width = Math.min(1000, Math.floor(display.workAreaSize.width / 2));
            options.x = display.workArea.x;
            options.y = display.workArea.y;
            options.onShow = appWin => {
                appWin.openDevTools();
            };
        }
        return this.createAppWindow(options);
    }

    /**
     * 尝试打开最后一个激活的窗口，或者创建一个主窗口
     */
    public openOrCreateWindow() {
        const lastFocusedAppWin = this.getLastFocusedWindow();
        if (lastFocusedAppWin) {
            lastFocusedAppWin.showAndFocus();
        } else {
            this.createMainWindow();
        }
    }

    /**
     * 询问用户是否打开新的主窗口
     */
    public async requestCreateMainWindow() {
        if (!this.isReady) {
            return;
        }
        if (DEBUG) {
            console.log('>> XuanxuanApp: confirm create main window.');
        }
        const {response} = await dialog.showMessageBox({
            buttons: [Lang.string('common.confirm', 'Confirm'), Lang.string('common.cancel', 'Cancel')],
            defaultId: 0,
            type: 'question',
            message: Lang.string('common.confirmCreateAppWindow', 'Do you want to open a new window? (You can log in another account in this window）')
        });
        if (response === 0) {
            this.createMainWindow();
        }
    }

    /**
     * 隐藏所有窗口
     */
    private hideAllWindows() {
        for (const appWin of this.appWindowMap.values()) {
            for (const childWindow of appWin.allChildWindows) {
                childWindow.hide();
            }
            appWin.hide();
        }

        if (DEBUG) {
            console.log('>> XuanxuanApp: hide all windows.');
        }
    }

    /**
     * 关闭所有窗口
     */
    private closeAndDestroyAllWindows() {
        for (const appWin of this.appWindowMap.values()) {
            appWin.closeAndDestroy();
        }
        this.appWindowMap.clear();

        for (const win of BrowserWindow.getAllWindows()) {
            win.destroy();
        }

        if (DEBUG) {
            console.log('>> XuanxuanApp: close all windows.');
        }
    }

    /**
     * 关闭指定窗口
     * @param triggerBrowserWindow 发出事件的窗口
     * @param winName 窗口名称
     * @param destroy 是否销毁窗口
     */
    private closeWindow(triggerBrowserWindow: BrowserWindow, winName: string, destroy = false) {
        const appWindow = this.getAppWindowOrChildWindow(triggerBrowserWindow, winName);
        if (appWindow) {
            if (destroy) {
                appWindow.closeAndDestroy();
            } else {
                appWindow.close();
            }
            return true;
        }
        return false;
    }

    /**
     * 立即关闭所有窗口并退出
     * @param task 退出前执行的任务信息对象
     */
    private async quit(task?: Task) {
        if (DEBUG) {
            console.log('>> XuanxuanApp: quit begin.');
        }

        this.hideAllWindows();

        unregisterGlobalShortcuts();

        if (task) {
            if (DEBUG) {
                console.log('>> XuanxuanApp: quit task begin', task);
            }

            await spawnTask(task);

            if (DEBUG) {
                console.log('>> XuanxuanApp: quit task finish');
            }
        }
        this.closeAndDestroyAllWindows();

        await delay(1000);

        app.quit();

        if (DEBUG) {
            console.log('>> XuanxuanApp: quit finish.');
            const windows = BrowserWindow.getAllWindows();
            if (windows.length) {
                console.log('>> XuanxuanApp: but there are still', windows.length, 'windows:');
                for (const window of windows) {
                    console.log('>> XuanxuanApp:     window', window.id, 'title', window.getTitle());
                }
            }
        }
    }

    /**
     * 创建 macOS 上的 dock 菜单
     */
    private createDockMenu() {
        if (!IS_MAC_OSX) {
            return;
        }
        const dockMenu = Menu.buildFromTemplate([
            {
                label: Lang.string('menu.createNewWindow', 'Create window...'),
                click: () => {
                    this.createMainWindow();
                }
            },
            {
                role: 'window',
                label: Lang.string('menu.window', 'Window'),
                submenu: [
                    {
                        role: 'close',
                        label: Lang.string('menu.close', 'Close')
                    }
                ]
            }
        ]);
        app.dock.setMenu(dockMenu);

        if (DEBUG) {
            console.log('>> XuanxuanApp: created dock menu.');
        }
    }

    /**
     * 创建应用菜单
     */
    private buildAppMenu() {
        if (!IS_MAC_OSX) {
            return;
        }

        const menu = Menu.buildFromTemplate([
            {
                label: Lang.string('app.title', electronConfig.pkg.displayName),
                submenu: [
                    {
                        label: Lang.string('menu.about'),
                        role: 'about'
                    }, {
                        type: 'separator'
                    }, {
                        label: 'Services',
                        submenu: new Array<Electron.MenuItemConstructorOptions>()
                    }, {
                        type: 'separator'
                    }, {
                        label: Lang.string('menu.hideCurrentWindow'),
                        accelerator: 'Command+H',
                        role: 'hide'
                    }, {
                        label: Lang.string('menu.hideOtherWindows'),
                        accelerator: 'Command+Shift+H',
                        role: 'hideOthers'
                    }, {
                        label: Lang.string('menu.showAllWindows'),
                        role: 'unhide'
                    }, {
                        type: 'separator'
                    }, {
                        label: Lang.string('menu.quit'),
                        accelerator: 'Command+Q',
                        click: () => {
                            this.quit();
                        }
                    }
                ]
            },
            {
                label: Lang.string('menu.edit'),
                submenu: [
                    {
                        label: Lang.string('menu.undo'),
                        accelerator: 'Command+Z',
                        role: 'undo'
                    },
                    // {
                    //     label: Lang.string('menu.redo'),
                    //     accelerator: 'Shift+Command+Z',
                    //     role: 'redo'
                    // },
                    {
                        type: 'separator'
                    }, {
                        label: Lang.string('menu.cut'),
                        accelerator: 'Command+X',
                        role: 'cut'
                    }, {
                        label: Lang.string('menu.copy'),
                        accelerator: 'Command+C',
                        role: 'copy'
                    }, {
                        label: Lang.string('menu.paste'),
                        accelerator: 'Command+V',
                        role: 'paste'
                    }, {
                        label: Lang.string('menu.selectAll'),
                        accelerator: 'Command+A',
                        role: 'selectAll'
                    }
                ]
            },
            {
                label: Lang.string('menu.view'),
                submenu: (DEBUG) ? [
                    {
                        label: Lang.string('menu.reload'),
                        accelerator: 'Command+R',
                        click: () => {
                            this.getLastFocusedWindow({includeChildWindow: true}).browserWindow.webContents.reload();
                        }
                    }, {
                        label: Lang.string('menu.toggleFullscreen'),
                        accelerator: 'Ctrl+Command+F',
                        click: () => {
                            const lastWindow = this.getLastFocusedWindow();
                            lastWindow.browserWindow.setFullScreen(!lastWindow.browserWindow.isFullScreen());
                        }
                    }, {
                        label: Lang.string('menu.toggleDeveloperTool'),
                        accelerator: 'Alt+Command+I',
                        click: () => {
                            this.lastFocusedAppWin.browserWindow.webContents.toggleDevTools();
                        }
                    }] : [{
                    label: Lang.string('menu.toggleFullscreen'),
                    accelerator: 'Ctrl+Command+F',
                    click: () => {
                        const lastWindow = this.getLastFocusedWindow();
                        lastWindow.browserWindow.setFullScreen(!lastWindow.browserWindow.isFullScreen());
                    }
                }]
            },
            {
                label: Lang.string('menu.window'),
                submenu: [
                    {
                        label: Lang.string('menu.createNewWindow'),
                        accelerator: 'Command+N',
                        click: () => {
                            this.createMainWindow();
                        }
                    }, {
                        label: Lang.string('menu.minimize'),
                        accelerator: 'Command+M',
                        role: 'minimize'
                    }, {
                        label: Lang.string('menu.close'),
                        accelerator: 'Command+W',
                        role: 'close'
                    }, {
                        type: 'separator'
                    }, {
                        label: Lang.string('menu.bringAllToFront'),
                        role: 'front'
                    }]
            },
            {
                label: Lang.string('menu.help'),
                submenu: [
                    {
                        label: Lang.string('menu.website'),
                        click: () => {
                            shell.openExternal(Lang.string('app.homepage', electronConfig.pkg.homepage));
                        }
                    }, {
                        label: Lang.string('menu.community'),
                        click() {
                            shell.openExternal('https://www.xuanim.com/forum/');
                        }
                    }]
            }]);
        Menu.setApplicationMenu(menu);

        if (DEBUG) {
            console.log('>> XuanxuanApp: build application menu.');
        }
    }

    /**
     * 设置关于对话框
     */
    private setAboutPanel() {
        if (!app.setAboutPanelOptions) {
            return;
        }
        app.setAboutPanelOptions({
            applicationName: Lang.string('app.name'),
            applicationVersion: electronConfig.pkg.version,
            copyright: `Copyright (C) ${electronConfig.pkg.buildTime ? new Date(electronConfig.pkg.buildTime).getFullYear() : '2022'} ${electronConfig.pkg.company}`,
            credits: `Licence: ${electronConfig.pkg.license}`,
            version: `${electronConfig.pkg.buildTime ? `build at ${new Date(electronConfig.pkg.buildTime).toLocaleString()}` : ''}${DEBUG ? '[debug]' : ''}`
        });

        if (DEBUG) {
            console.log('>> XuanxuanApp: set about panel.');
        }
    }

    /**
     * 响应渲染进程远程调用
     */
    private bindIpcMainHandle() {
        ipcMain.handle('xuan:quit',(_event, task: Task) => {
            this.quit(task);
        });
        ipcMain.handle('xuan:changeLang', (_event, winName: string, langName: ValueOf<typeof Language>, langData: Record<string, string>) => {
            this.changeLang(winName, langName, langData);
        });
        ipcMain.handle('xuan:setTrayTooltip', (_event, winName: string, value: string) => {
            const appWin = this.getAppWindow(winName);
            appWin?.setTrayTooltip(value);
        });
        ipcMain.handle('xuan:setTrayTitle', (_event, winName: string, value: string) => {
            const appWin = this.getAppWindow(winName);
            appWin?.setTrayTitle(value);
        });
        ipcMain.handle('xuan:flashTray', (_event, winName: string, value: boolean) => {
            const appWin = this.getAppWindow(winName);
            appWin?.flashTray(value);
        });
        ipcMain.handle('xuan:setTrayToGray', (_event, winName: string, value: boolean) => {
            const appWin = this.getAppWindow(winName);
            appWin?.setTrayToGray(value);
        });
        ipcMain.handle('xuan:closeWindow', (event, winName: string, destroy: boolean) => {
            const triggerBrowserWindow = BrowserWindow.fromWebContents(event.sender);
            if (triggerBrowserWindow) {
                this.closeWindow(triggerBrowserWindow, winName, destroy);
            }
        });
        ipcMain.handle('xuan:initWebview', (_event, id: number) => {
            const wc = webContents.fromId(id);
            if (!wc) {
                return;
            }

            wc.on('context-menu', (_e, props) => {
                const {selectionText, isEditable, x, y} = props;
                if (isEditable) {
                    showInputContextMenu(x, y, Lang);
                } else if (selectionText && selectionText.trim() !== '') {
                    showSelectionContextMenu(x, y, Lang);
                }
            });
        });

        /**
         * 处理主窗口界面就绪事件
         * @param _event 进程间事件对象
         * @param name 窗口名称
         * @param config 主窗口运行时配置对象
         */
        ipcMain.handle('xuan:handleMainWinUIReady', (_event, winName: string, config: Parameters<typeof updateConfig>[0]) => {
            if (!this.firstMainWindowReady) {
                this.handleFirstMainWinUIReady(config);
                this.firstMainWindowReady = true;
            }

            const appWin = this.getAppWindow(winName);
            appWin?.buildTray();

            if (DEBUG) {
                console.log('>> XuanxuanApp: main window ui ready');
            }
        });
    }

    /**
     * 绑定 Electron 应用事件
     */
    private bindElectronEvents() {
        // 当所有窗口关闭时退出应用
        app.on('window-all-closed', () => {
            if (DEBUG) {
                console.log('>> XuanxuanApp: window-all-closed');
            }
            try {
                this.quit();
            } catch (error) {
                if (DEBUG) {
                    console.log('>> XuanxuanApp: Quit failed when window all closed', error);
                }
            }
        });

        if (DEBUG) {
            app.on('quit', () => {
                console.log('>> ElectronApp: quit');
            });
            app.on('will-quit', () => {
                console.log('>> ElectronApp: will quit');
            });
        }

        // 当 Electron 应用被激活时调用
        app.on('activate', () => {
            // 在 OS X 系统上，可能存在所有应用窗口关闭了，但是程序还没关闭，此时如果收到激活应用请求需要
            // 重新打开应用窗口并创建应用菜单
            this.openOrCreateWindow();
            this.buildAppMenu();

            if (DEBUG) {
                console.log('>> ElectronApp: activate');
            }
        });
    }

    /**
     * 处理第一个主窗口界面就绪事件
     * @param config 主窗口运行时配置对象
     */
    private handleFirstMainWinUIReady(config: Parameters<typeof updateConfig>[0]) {
        updateConfig(config);

        // BUG #72 http://xuan.5upm.com/bug-view-72.html
        // Electron Issue #10864 https://github.com/electron/electron/issues/10864
        if (IS_WINDOWS_OS && app.setAppUserModelId) {
            const userModelId = `com.cnezsoft.${electronConfig.pkg.name || 'xuanxuan'}`;
            app.setAppUserModelId(userModelId);
            if (DEBUG) console.log(`>> XuanxuanApp: set AppUserModelId to ${userModelId}.`);
        }

        this.setAboutPanel();
        this.buildAppMenu();
        this.createDockMenu();
    }

    /**
     * 处理应用窗口关闭事件
     * @param appWin 应用窗口
     */
    private handleAppWindowClosed(appWin: AppWindow) {
        const {name} = appWin;
        this.appWindowMap.delete(name);
        if (this.appWindowMap.size === 0) {
            this.quit();
        }
    }

    /**
     * 处理应用子窗口关闭事件
     * @param appChildWindow 应用子窗口
     */
    private handleAppChildWindowClosed(appChildWindow: AppChildWindow) {
        // 通知其他窗口此窗口已经关闭
        const appWinName = appChildWindow.parentWinName;
        const appChildWinName = appChildWindow.name;

        const appWin = this.getAppWindow(appWinName);
        appWin.sendToRenderer(EVENT_CHILD_WINDOW_CLOSED, appChildWinName);
        for (const childWindow of appWin.allChildWindows) {
            childWindow.sendToRenderer(EVENT_CHILD_WINDOW_CLOSED, appChildWinName);
        }
    }

    /**
     * 构建主窗口托盘图标
     * @param appWin 应用窗口管理对象
     * @returns 托盘图标信息对象
     */
    private buildMainWindowTray(appWin: AppWindow) {
        const appPath = app.getAppPath();

        // 准备默认的图片图标资源
        let trayIconImg: Electron.NativeImage = null;
        let trayGrayIconImg: Electron.NativeImage = null;
        if (IS_MAC_OSX) {
            const macTrayIconImg = nativeImage.createFromPath(`${appPath}/${electronConfig.media['image.path']}tray-iconTemplate.png`);
            if (!macTrayIconImg.isEmpty()) {
                trayIconImg = macTrayIconImg;
                trayGrayIconImg = macTrayIconImg;
            }
        } else if (IS_WINDOWS_OS) {
            const winTrayIconImg = nativeImage.createFromPath(`${appPath}/${electronConfig.media['image.path']}tray-icon.ico`);
            const winGrayIconImg = nativeImage.createFromPath(`${appPath}/${electronConfig.media['image.path']}tray-gray-icon.ico`);
            if (!winTrayIconImg.isEmpty()) {
                trayIconImg = winTrayIconImg;
                trayGrayIconImg = winGrayIconImg;
            }
        }
        if (!trayIconImg) {
            trayIconImg = nativeImage.createFromPath(`${appPath}/${electronConfig.media['image.path']}tray-icon.png`);
            trayGrayIconImg = nativeImage.createFromPath(`${appPath}/${electronConfig.media['image.path']}tray-gray-icon.png`);
        }

        // 创建一个通知栏图标
        const tray = new Tray(trayIconImg);

        // 设置通知栏图标鼠标提示
        tray.setToolTip(Lang.string('app.title', electronConfig.pkg.displayName));

        // 绑定通知栏图标点击事件
        if (IS_MAC_OSX) {
            tray.on('mouse-down', () => {
                appWin.sendToRenderer(REQUEST_OPEN_FROM_TRAY, 'tray-icon');
                appWin.showAndFocus();
            });
        } else {
            tray.on('click', () => {
                appWin.sendToRenderer(REQUEST_OPEN_FROM_TRAY, 'tray-icon');
                appWin.showAndFocus();
            });
        }

        // 设置通知栏图标右键菜单
        const trayContextMenu = Menu.buildFromTemplate([
            {
                label: Lang.string('common.open'),
                click: () => {
                    appWin.sendToRenderer(REQUEST_OPEN_FROM_TRAY, 'tray-menu');
                    appWin.showAndFocus();
                }
            }, {
                label: Lang.string('menu.createNewWindow'),
                click: () => {
                    this.createMainWindow();
                }
            }, {
                label: Lang.string('common.exit'),
                click: () => {
                    appWin.close('quit');
                }
            }
        ]);

        tray.setContextMenu(trayContextMenu);

        const icons = {
            normalTray: trayIconImg,
            blankTray: nativeImage.createFromPath(`${appPath}/${electronConfig.media['image.path']}tray-icon-transparent.png`),
            grayTray: trayGrayIconImg
        };

        return {tray, icons};
    }
}
