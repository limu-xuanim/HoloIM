import {ipcRenderer} from 'electron';

type Shell = {
    shellOpenExternal: PromiseReturn<typeof Electron['shell']['openExternal']>;
    shellOpenPath: PromiseReturn<typeof Electron['shell']['openPath']>;
    shellShowItemInFolder: PromiseReturn<typeof Electron['shell']['showItemInFolder']>;
};

export default {
    shellOpenExternal: ipcRenderer.invoke.bind(ipcRenderer, 'shell:openExternal'),
    shellOpenPath: ipcRenderer.invoke.bind(ipcRenderer, 'shell:openPath'),
    shellShowItemInFolder: ipcRenderer.invoke.bind(ipcRenderer, 'shell:showItemInFolder'),
} as Shell;
