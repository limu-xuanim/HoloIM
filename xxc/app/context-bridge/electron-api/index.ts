import app from './app';
import clipboard from './clipboard';
import cookies from './cookies';
import current from './current';
import dialog from './dialog';
import globalShortcut from './global-shortcut';
import ipcRendererMethods from './ipc-renderer-methods';
import nativeImage from './native-image';
import shell from './shell';
import systemPreferences from './system-preferences';
import windowListener from './window-listener';

const electronAPI = {
    ...app,
    ...clipboard,
    ...cookies,
    ...current,
    ...dialog,
    ...globalShortcut,
    ...ipcRendererMethods,
    ...nativeImage,
    ...shell,
    ...systemPreferences,
    ...windowListener
};

export default electronAPI;

declare global {
    interface Window {
        electronAPI: typeof electronAPI;
    }
}
