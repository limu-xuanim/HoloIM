import {ipcRenderer} from 'electron';
import type {Task} from '~/app/main-process/app';
import type {Language} from '../constants';

type XuanAPI = {
    quit: (task?: Task) => Promise<void>;
    changeLang: (winName: string, langName: ValueOf<typeof Language>, langData: Record<string, string>) => Promise<void>;
    setTrayTooltip: (winName: string, value: string) => Promise<void>;
    setTrayTitle: (winName: string, value: string) => Promise<void>;
    flashTray: (winName: string, value: boolean) => Promise<void>;
    setTrayToGray: (winName: string, value: boolean) => Promise<void>;
    /**
     * 关闭指定窗口
     * @param winName 窗口名称
     * @param destroy 是否销毁窗口
     */
    closeWindow: (name: string, destroy?: boolean) => Promise<boolean>;
    handleMainWinUIReady: (winName: string, config: Partial<import('~/app/config').Config>) => Promise<void>;
    getDesktopSources: (options: Electron.SourcesOptions) => Promise<Electron.DesktopCapturerSource[]>;
    initWebview: (id: number) => Promise<void>;
};

const xuanAPI: XuanAPI = {
    quit: ipcRenderer.invoke.bind(ipcRenderer, 'xuan:quit'),
    changeLang: ipcRenderer.invoke.bind(ipcRenderer, 'xuan:changeLang'),
    setTrayTooltip: ipcRenderer.invoke.bind(ipcRenderer, 'xuan:setTrayTooltip'),
    setTrayTitle: ipcRenderer.invoke.bind(ipcRenderer, 'xuan:setTrayTitle'),
    flashTray: ipcRenderer.invoke.bind(ipcRenderer, 'xuan:flashTray'),
    setTrayToGray: ipcRenderer.invoke.bind(ipcRenderer, 'xuan:setTrayToGray'),
    closeWindow: ipcRenderer.invoke.bind(ipcRenderer, 'xuan:closeWindow'),
    handleMainWinUIReady: ipcRenderer.invoke.bind(ipcRenderer, 'xuan:handleMainWinUIReady'),
    getDesktopSources: (options: Electron.SourcesOptions) => ipcRenderer.invoke('jitsi-screen-sharing-get-sources', options),
    initWebview: ipcRenderer.invoke.bind(ipcRenderer, 'xuan:initWebview'),
};

export default xuanAPI;

declare global {
    interface Window {
        xuanAPI: XuanAPI;
    }
}
