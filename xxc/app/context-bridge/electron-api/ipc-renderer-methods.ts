import {ipcRenderer, type IpcRendererEvent} from 'electron';
import {EVENT_APP_LANG_CHANGE, EVENT_APP_OPEN_URL, EVENT_CHILD_WINDOW_CLOSED, EVENT_WINDOW_WILL_CLOSE, PERF_MESSAGE, REQUEST_OPEN_FROM_TRAY, WEBVIEW_NEW_WINDOW} from '~/app/platform/electron/remote-events';

type IpcRendererMethods = {
    ipcRenderer: {
        on: {
            [EVENT_CHILD_WINDOW_CLOSED]: (listener: (event: IpcRendererEvent, name: string) => void) => void;
            [PERF_MESSAGE]: (listener: (event: IpcRendererEvent, message: string) => any) => void;
            [EVENT_APP_LANG_CHANGE]: (listener: (event: IpcRendererEvent, lang: ValueOf<typeof Language>) => void) => void;
            [EVENT_WINDOW_WILL_CLOSE]: (listener: (event: IpcRendererEvent, reason: string) => void) => void;
            [EVENT_APP_OPEN_URL]: (listener: (event: IpcRendererEvent, url: string) => void) => void;
            [REQUEST_OPEN_FROM_TRAY]: (listener: (event: IpcRendererEvent, from: 'tray-icon' | 'tray-menu') => void) => void;
            [WEBVIEW_NEW_WINDOW]: (listener: (event: IpcRendererEvent, wcId: number, details: Electron.HandlerDetails) => void) => void;
        },
        send: {
            [PERF_MESSAGE]: (message: string) => void;
        },
    };
    ipcRendererOff: (channel: string, listener: Parameters<typeof ipcRenderer.off>[1]) => void;
};

export default {
    ipcRenderer: {
        on: {
            [EVENT_CHILD_WINDOW_CLOSED]: (listener) => ipcRenderer.on(EVENT_CHILD_WINDOW_CLOSED, listener),
            [PERF_MESSAGE]: (listener) => ipcRenderer.on(PERF_MESSAGE, listener),
            [EVENT_APP_LANG_CHANGE]: (listener) => ipcRenderer.on(EVENT_APP_LANG_CHANGE, listener),
            [EVENT_WINDOW_WILL_CLOSE]: (listener) => ipcRenderer.on(EVENT_WINDOW_WILL_CLOSE, listener),
            [EVENT_APP_OPEN_URL]: (listener) => ipcRenderer.on(EVENT_APP_OPEN_URL, listener),
            [REQUEST_OPEN_FROM_TRAY]: (listener) => ipcRenderer.on(REQUEST_OPEN_FROM_TRAY, listener),
            [WEBVIEW_NEW_WINDOW]: (listener) => ipcRenderer.on(WEBVIEW_NEW_WINDOW, listener)
        },
        send: {
            [PERF_MESSAGE]: (message) => ipcRenderer.send(PERF_MESSAGE, message),
        },
    },
    ipcRendererOff: (channel: string, listener: Parameters<typeof ipcRenderer.off>[1]) => {
        ipcRenderer.off(channel, listener);
    },
} as IpcRendererMethods;
