import {ipcRenderer} from 'electron';

type Dialog = {
    showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
    showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
    showMessageBox: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>;
};

export default {
    showSaveDialog: ipcRenderer.invoke.bind(ipcRenderer, 'dialog:showSaveDialog'),
    showOpenDialog: ipcRenderer.invoke.bind(ipcRenderer, 'dialog:showOpenDialog'),
    showMessageBox: ipcRenderer.invoke.bind(ipcRenderer, 'dialog:showMessageBox'),
} as Dialog;
