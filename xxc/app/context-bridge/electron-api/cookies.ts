import {ipcRenderer} from 'electron';

type Cookies = {
    cookiesGet: (filter: Electron.CookiesGetFilter) => Promise<Electron.Cookie[]>;
    cookiesSet: (details: Electron.CookiesSetDetails) => Promise<void>;
    cookiesRemove: (url: string, name: string) => Promise<void>;
};

export default {
    cookiesGet: ipcRenderer.invoke.bind(ipcRenderer, 'cookies:get'),
    cookiesSet: ipcRenderer.invoke.bind(ipcRenderer, 'cookies:set'),
    cookiesRemove: ipcRenderer.invoke.bind(ipcRenderer, 'cookies:remove'),
} as Cookies;
