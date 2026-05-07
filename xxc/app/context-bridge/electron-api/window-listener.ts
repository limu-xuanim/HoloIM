import {ipcRenderer} from 'electron';
import {BROWSER_WINDOW_EVENT} from '~/app/platform/electron/remote-events';

type WindowListener = {
    onWindowMinimize: (callback: Parameters<typeof ipcRenderer.on>[1]) => void;
    onWindowMaximize: (callback: Parameters<typeof ipcRenderer.on>[1]) => void;
    onWindowUnmaximize: (callback: Parameters<typeof ipcRenderer.on>[1]) => void;
    onWindowRestore: (callback: Parameters<typeof ipcRenderer.on>[1]) => void;
    onWindowShow: (callback: Parameters<typeof ipcRenderer.on>[1]) => void;
    onWindowFocus: (callback: Parameters<typeof ipcRenderer.on>[1]) => void;
    onWindowBlur: (callback: Parameters<typeof ipcRenderer.on>[1]) => void;
    onWindowLeaveFullScreen: (callback: Parameters<typeof ipcRenderer.on>[1]) => void;
};

export default {
    onWindowMinimize: (callback: Parameters<typeof ipcRenderer.on>[1]) => {
        ipcRenderer.on(BROWSER_WINDOW_EVENT.MINIMIZE, callback);
    },

    onWindowMaximize: (callback: Parameters<typeof ipcRenderer.on>[1]) => {
        ipcRenderer.on(BROWSER_WINDOW_EVENT.MAXIMIZE, callback);
    },

    onWindowUnmaximize: (callback: Parameters<typeof ipcRenderer.on>[1]) => {
        ipcRenderer.on(BROWSER_WINDOW_EVENT.UNMAXIMIZE, callback);
    },

    onWindowRestore: (callback: Parameters<typeof ipcRenderer.on>[1]) => {
        ipcRenderer.on(BROWSER_WINDOW_EVENT.RESTORE, callback);
    },

    onWindowShow: (callback: Parameters<typeof ipcRenderer.on>[1]) => {
        ipcRenderer.on(BROWSER_WINDOW_EVENT.SHOW, callback);
    },

    onWindowFocus: (callback: Parameters<typeof ipcRenderer.on>[1]) => {
        ipcRenderer.on(BROWSER_WINDOW_EVENT.FOCUS, callback);
    },

    onWindowBlur: (callback: Parameters<typeof ipcRenderer.on>[1]) => {
        ipcRenderer.on(BROWSER_WINDOW_EVENT.BLUR, callback);
    },

    onWindowLeaveFullScreen: (callback: Parameters<typeof ipcRenderer.on>[1]) => {
        ipcRenderer.on(BROWSER_WINDOW_EVENT.LEAVE_FULL_SCREEN, callback);
    },
} as WindowListener;
