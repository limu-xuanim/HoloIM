import {ipcMain, app, BrowserWindow, dialog, systemPreferences, globalShortcut, shell, screen, session} from "electron";

const registerRemoteEvents = () => {
    ipcMain.handle('app:getName', () => app.getName());
    ipcMain.handle('app:setLoginItemSettings', (_event, settings) => app.setLoginItemSettings(settings));
    ipcMain.handle('app:dockSetBadge', (_event, text) => app.dock.setBadge(text));
    ipcMain.handle('app:dockBounce', (_event, type) => app.dock.bounce(type));
    ipcMain.handle('app:dockCancelBounce', (_event, id) => app.dock.cancelBounce(id));
    ipcMain.handle('dialog:showSaveDialog', (event, options) => dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender)!, options));
    ipcMain.handle('dialog:showOpenDialog', (event, options) => dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender)!, options));
    ipcMain.handle('dialog:showMessageBox', (event, options) => dialog.showMessageBox(BrowserWindow.fromWebContents(event.sender)!, options));
    ipcMain.handle('systemPreferences:getUserDefault', (_event, key, type) => systemPreferences.getUserDefault(key, type));
    ipcMain.handle('systemPreferences:getMediaAccessStatus', (_event, mediaType) => systemPreferences.getMediaAccessStatus(mediaType));
    ipcMain.handle('screen:getAllDisplays', () => screen.getAllDisplays());
    ipcMain.handle('cookies:get', (_event, filter) => session.defaultSession.cookies.get(filter));
    ipcMain.handle('cookies:set', (_event, details) => session.defaultSession.cookies.set(details));
    ipcMain.handle('cookies:remove', (_event, url, name) => session.defaultSession.cookies.remove(url, name));
    ipcMain.handle('shell:openExternal', (_event, url, options) => shell.openExternal(url, options));
    ipcMain.handle('shell:openPath', (_event, path) => shell.openPath(path));
    ipcMain.handle('shell:showItemInFolder', (_event, fullPath) => shell.showItemInFolder(fullPath));
    ipcMain.handle('globalShortcut:unregister', (_event, accelerator) => globalShortcut.unregister(accelerator));
    ipcMain.handle('globalShortcut:register', (event, name, accelerator) => globalShortcut.register(accelerator, () => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.webContents.send(`globalShortcut:execute:${name}`);
        }
    }));
    ipcMain.handle('globalShortcut:isRegistered', (_event, accelerator) => globalShortcut.isRegistered(accelerator));
    ipcMain.handle('globalShortcut:unregisterAll', () => globalShortcut.unregisterAll());

    ipcMain.handle('currentWindow:openDevTools', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.webContents.openDevTools({
                mode: 'detach'
            });
        }
    });
    ipcMain.handle('currentWindow:close', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.close();
        }
    });
    ipcMain.handle('currentWindow:destroy', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.destroy();
        }
    });
    ipcMain.handle('currentWindow:reload', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.reload();
        }
    });
    ipcMain.handle('currentWindow:minimize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.minimize();
        }
    });
    ipcMain.handle('currentWindow:maximize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.maximize();
        }
    });
    ipcMain.handle('currentWindow:unmaximize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.unmaximize();
        }
    });
    ipcMain.handle('currentWindow:setResizable', (event, resizable: boolean) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setResizable(resizable);
        }
    });
    ipcMain.handle('currentWindow:restore', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.restore();
        }
    });
    ipcMain.handle('currentWindow:hide', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.hide();
        }
    });
    ipcMain.handle('currentWindow:show', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.show();
        }
    });
    ipcMain.handle('currentWindow:focus', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.focus();
        }
    });
    ipcMain.handle('currentWindow:setTitle', (event, title) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setTitle(title);
        }
    });
    ipcMain.handle('currentWindow:setSkipTaskbar', (event, skip) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setSkipTaskbar(skip);
        }
    });
    ipcMain.handle('currentWindow:flashFrame', (event, flag) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.flashFrame(flag);
        }
    });
    ipcMain.handle('currentWindow:setMinimumSize', (event, width, height) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setMinimumSize(width, height);
        }
    });
    ipcMain.handle('currentWindow:setSize', (event, width, height) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setSize(width, height, true);
        }
    });
    ipcMain.handle('currentWindow:center', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.center();
        }
    });
    ipcMain.handle('currentWindow:setSmallSize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            if (win.isMaximized()) {
                win.unmaximize();
            } else if (win.isFullScreen()) {
                win.setFullScreen(false);
            }

            win.setSize(800, 480, true);
            win.center();
            win.setResizable(false);
            win.setFullScreenable(false);
            win.setMaximizable(false);
        }
    });
    ipcMain.handle('currentWindow:setNormalSize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setResizable(true);
            win.setFullScreenable(true);
            win.setMaximizable(true);
            win.setSize(1000, 750);
            win.center();
        }
    });
    ipcMain.handle('currentWindow:setFullScreen', (event, flag) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setFullScreen(flag);
        }
    });
    ipcMain.handle('currentWindow:setVibrancy', (event, type) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.setVibrancy(type);
        }
    });

    ipcMain.handle('currentWindow:moveAbove', (event, mediaSourceId) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.moveAbove(mediaSourceId);
        }
    });

    ipcMain.handle('currentWebContents:copy', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.webContents.copy();
        }
    });
    ipcMain.handle('currentWebContents:selectAll', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.webContents.selectAll();
        }
    });
    ipcMain.handle('currentWebContents:zoomFactor', (event, factor) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            win.webContents.zoomFactor = factor;
        }
    });

    ipcMain.on('app:getLoginItemSettings', (event, options) => {
        event.returnValue = app.getLoginItemSettings(options);
    });

    /**
     * ipcRenderer.sendSync 必须在主进程中使用ipcMain.on来监听
     * 返回值必须通过event.returnValue返回，否则会导致渲染进程卡死
     */
    ipcMain.on('currentWindow:isFocused', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            event.returnValue = win.isFocused();
            return;
        }
        event.returnValue = false;
    });
    ipcMain.on('currentWindow:isMaximized', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            event.returnValue = win.isMaximized();
            return;
        }
        event.returnValue = false;
    });
    ipcMain.on('currentWindow:isMinimized', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            event.returnValue = win.isMinimized();
            return;
        }
        event.returnValue = false;
    });
    ipcMain.on('currentWindow:isVisible', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            event.returnValue = win.isVisible();
            return;
        }
        event.returnValue = false;
    });
    ipcMain.on('currentWindow:getSize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            event.returnValue = win.getSize();
            return;
        }
        event.returnValue = [0, 0];
    });
    ipcMain.on('currentWindow:isFullScreen', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            event.returnValue = win.isFullScreen();
            return;
        }
        event.returnValue = false;
    });
    ipcMain.on('currentWindow:getMediaSourceId', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
            event.returnValue = win.getMediaSourceId();
            return;
        }
        event.returnValue = '';
    });
    ipcMain.on('app:getLocale', (event) => {
        event.returnValue = app.getLocale();
    });
    ipcMain.on('app:getPath', (event, name) => {
        event.returnValue = app.getPath(name);
    });
    ipcMain.on('app:getAppPath', (event) => {
        event.returnValue = app.getAppPath();
    });
};

export default registerRemoteEvents;
