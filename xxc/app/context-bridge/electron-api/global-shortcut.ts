import {ipcRenderer} from 'electron';

type GlobalShortcut = {
    globalShortcutUnregister: PromiseReturn<(name: string, accelerator: string) => void>;
    globalShortcutRegister: PromiseReturn<(name: string, accelerator: string, callback: () => void) => boolean>;
    globalShortcutIsRegistered: PromiseReturn<typeof Electron['globalShortcut']['isRegistered']>;
    globalShortcutUnregisterAll: PromiseReturn<typeof Electron['globalShortcut']['unregisterAll']>;
};

const globalShortcutMap = new Map<string, () => void>();

export default {
    globalShortcutUnregister: (name: string, accelerator: string) => {
        if (globalShortcutMap.has(name)) {
            const callback = globalShortcutMap.get(name)!;
            ipcRenderer.off(`globalShortcut:execute:${name}`, callback);
        }
        return ipcRenderer.invoke('globalShortcut:unregister', accelerator);

    },
    globalShortcutRegister: (name: string, accelerator: string, callback: () => void) => {
        ipcRenderer.on(`globalShortcut:execute:${name}`, callback);
        globalShortcutMap.set(name, callback);
        return ipcRenderer.invoke('globalShortcut:register', name, accelerator);
    },
    globalShortcutIsRegistered: ipcRenderer.invoke.bind(ipcRenderer, 'globalShortcut:isRegistered'),
    globalShortcutUnregisterAll: () => {
        for (const [name, callback] of globalShortcutMap) {
            ipcRenderer.off(`globalShortcut:execute:${name}`, callback);
        }
        return ipcRenderer.invoke('globalShortcut:unregisterAll');
    },
} as GlobalShortcut;
