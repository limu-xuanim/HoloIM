import {type BrowserWindow, ipcRenderer} from 'electron';

type Current = {
    currentWindow: {
        openDevTools: PromiseReturn<() => void>;
        close: PromiseReturn<BrowserWindow['close']>;
        destroy: PromiseReturn<BrowserWindow['destroy']>
        reload: PromiseReturn<BrowserWindow['reload']>;
        minimize: PromiseReturn<BrowserWindow['minimize']>;
        maximize: PromiseReturn<BrowserWindow['maximize']>;
        unmaximize: PromiseReturn<BrowserWindow['unmaximize']>;
        setResizable: PromiseReturn<BrowserWindow['setResizable']>;
        restore: PromiseReturn<BrowserWindow['restore']>;
        hide: PromiseReturn<BrowserWindow['hide']>
        show: PromiseReturn<BrowserWindow['show']>;
        focus: PromiseReturn<BrowserWindow['focus']>;
        setTitle: PromiseReturn<BrowserWindow['setTitle']>;
        setSkipTaskbar: PromiseReturn<BrowserWindow['setSkipTaskbar']>;
        flashFrame: PromiseReturn<BrowserWindow['flashFrame']>;
        setMinimumSize: PromiseReturn<BrowserWindow['setMinimumSize']>;
        setSize: PromiseReturn<BrowserWindow['setSize']>;
        setFullScreen: PromiseReturn<BrowserWindow['setFullScreen']>;
        setVibrancy: PromiseReturn<BrowserWindow['setVibrancy']>;
        center: PromiseReturn<BrowserWindow['center']>;
        setSmallSize: PromiseReturn<() => void>;
        setNormalSize: PromiseReturn<() => void>;
        moveAbove: PromiseReturn<BrowserWindow['moveAbove']>;
        isFocused: BrowserWindow['isFocused'];
        isMaximized: BrowserWindow['isMaximized'];
        isMinimized: BrowserWindow['isMinimized'];
        isVisible: BrowserWindow['isVisible'];
        getSize: BrowserWindow['getSize'];
        isFullScreen: BrowserWindow['isFullScreen'];
        getMediaSourceId: BrowserWindow['getMediaSourceId'];
    };
    currentWebContents: {
        copy: PromiseReturn<InstanceType<typeof Electron['webContents']>['copy']>;
        selectAll: PromiseReturn<InstanceType<typeof Electron['webContents']>['selectAll']>;
        zoomFactor: (num: number) => Promise<void>;
    };
};

export default {
    currentWindow: {
        close: ipcRenderer.invoke.bind(ipcRenderer,'currentWindow:close'),
        destroy: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:destroy'),
        reload: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:reload'),
        minimize: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:minimize'),
        maximize: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:maximize'),
        unmaximize: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:unmaximize'),
        setResizable: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:setResizable'),
        restore: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:restore'),
        hide: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:hide'),
        show: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:show'),
        focus: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:focus'),
        isFocused: ipcRenderer.sendSync.bind(ipcRenderer, 'currentWindow:isFocused'),
        isMaximized: ipcRenderer.sendSync.bind(ipcRenderer, 'currentWindow:isMaximized'),
        isMinimized: ipcRenderer.sendSync.bind(ipcRenderer, 'currentWindow:isMinimized'),
        isVisible: ipcRenderer.sendSync.bind(ipcRenderer, 'currentWindow:isVisible'),
        setTitle: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:setTitle'),
        setSkipTaskbar: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:setSkipTaskbar'),
        flashFrame: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:flashFrame'),
        setMinimumSize: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:setMinimumSize'),
        center: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:center'),
        setSize: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:setSize'),
        getSize: ipcRenderer.sendSync.bind(ipcRenderer, 'currentWindow:getSize'),
        isFullScreen: ipcRenderer.sendSync.bind(ipcRenderer, 'currentWindow:isFullScreen'),
        setFullScreen: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:setFullScreen'),
        setVibrancy: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:setVibrancy'),
        getMediaSourceId: ipcRenderer.sendSync.bind(ipcRenderer, 'currentWindow:getMediaSourceId'),
        moveAbove: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:moveAbove'),
        openDevTools: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:openDevTools'),
        setSmallSize: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:setSmallSize'),
        setNormalSize: ipcRenderer.invoke.bind(ipcRenderer, 'currentWindow:setNormalSize'),
    },
    currentWebContents: {
        copy: ipcRenderer.invoke.bind(ipcRenderer, 'currentWebContents:copy'),
        selectAll: ipcRenderer.invoke.bind(ipcRenderer, 'currentWebContents:selectAll'),
        zoomFactor: ipcRenderer.invoke.bind(ipcRenderer, 'currentWebContents:zoomFactor'),
    }
} as Current;
