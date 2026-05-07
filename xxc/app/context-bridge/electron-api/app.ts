import {ipcRenderer} from 'electron';

type App = {
    getName: PromiseReturn<typeof Electron['app']['getName']>;
    getPath: typeof Electron['app']['getPath'];
    getAppPath: typeof Electron['app']['getAppPath'];
    getLocale: typeof Electron['app']['getLocale'];
    dockSetBadge: PromiseReturn<typeof Electron['app']['dock']['setBadge']>;
    dockBounce: PromiseReturn<typeof Electron['app']['dock']['bounce']>;
    dockCancelBounce: PromiseReturn<typeof Electron['app']['dock']['cancelBounce']>;
    getLoginItemSettings: typeof Electron['app']['getLoginItemSettings'];
    setLoginItemSettings: PromiseReturn<typeof Electron['app']['setLoginItemSettings']>;
};

export default {
    getName: ipcRenderer.invoke.bind(ipcRenderer, 'app:getName'),
    getPath: ipcRenderer.sendSync.bind(ipcRenderer, 'app:getPath'),
    getAppPath: ipcRenderer.sendSync.bind(ipcRenderer, 'app:getAppPath'),
    getLocale: ipcRenderer.sendSync.bind(ipcRenderer, 'app:getLocale'),
    getLoginItemSettings: ipcRenderer.sendSync.bind(ipcRenderer, 'app:getLoginItemSettings'),
    setLoginItemSettings: ipcRenderer.invoke.bind(ipcRenderer, 'app:setLoginItemSettings'),
    dockSetBadge: ipcRenderer.invoke.bind(ipcRenderer, 'app:dockSetBadge'),
    dockBounce: ipcRenderer.invoke.bind(ipcRenderer, 'app:dockBounce'),
    dockCancelBounce: ipcRenderer.invoke.bind(ipcRenderer, 'app:dockCancelBounce'),
} as App;
