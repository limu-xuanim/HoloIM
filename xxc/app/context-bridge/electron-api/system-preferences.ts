import {ipcRenderer} from 'electron';

type SystemPreferences = {
    getUserDefault: PromiseReturn<typeof Electron['systemPreferences']['getUserDefault']>;
    getMediaAccessStatus: PromiseReturn<typeof Electron['systemPreferences']['getMediaAccessStatus']>;
};

export default {
    getUserDefault: ipcRenderer.invoke.bind(ipcRenderer, 'systemPreferences:getUserDefault'),
    getMediaAccessStatus: ipcRenderer.invoke.bind(ipcRenderer, 'systemPreferences:getMediaAccessStatus'),
} as SystemPreferences;
