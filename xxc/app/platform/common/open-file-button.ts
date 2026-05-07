import {isNotEmptyArray} from '~/app/utils/check-empty';

/** 选择文件按钮 */
const fileButton = <HTMLInputElement>document.getElementById('fileOpenButton');

type ShowOpenDialogCallback = (files: FileList) => void;

/**
 * 显示打开文件对话框
 * @param callback 文件选择完成后的回调函数，如果返回 `false`，表示选择文件失败，否则为所选择的文件对象数组
 */
export function showOpenDialog(callback: ShowOpenDialogCallback): void;

/**
 * 显示打开文件对话框
 * @param acceptExts 可用选择的文件扩展名
 * @param callback 文件选择完成后的回调函数，如果返回 `false`，表示选择文件失败，否则为所选择的文件对象数组
 */
export function showOpenDialog(acceptExts: string, callback: ShowOpenDialogCallback): void;

/**
 * 显示打开文件对话框
 * @param  acceptExts 可用选择的文件扩展名
 * @param callback 文件选择完成后的回调函数，如果返回 `false`，表示选择文件失败，否则为所选择的文件对象数组
 */
export function showOpenDialog(acceptExts: {filters: Electron.FileFilter[]}, callback: ShowOpenDialogCallback): void;

export function showOpenDialog(acceptExts: string|{filters: Electron.FileFilter[]}|ShowOpenDialogCallback, callback?: ShowOpenDialogCallback) {
    if (typeof acceptExts === 'function') {
        callback = acceptExts;
        acceptExts = '';
    }

    if (typeof acceptExts === 'object' && acceptExts) {
        const {filters} = acceptExts;
        const extensions: string[] = [];
        if (isNotEmptyArray(filters)) {
            for (const filter of filters) {
                if (isNotEmptyArray(filter.extensions)) {
                    for (const ext of filter.extensions) {
                        if (ext && ext !== '*') {
                            extensions.push(ext.includes('/') ? ext : `.${ext}`);
                        }
                    }
                }

            }
        }
        acceptExts = extensions.join(',');
    }

    fileButton.accept = acceptExts as string;
    fileButton.onchange = () => {
        const {files} = fileButton;
        if (files.length) {
            callback(files);
            setTimeout(() => {
                fileButton.onchange = null;
                fileButton.value = '';
            }, 500);
        } else {
            callback(null);
        }
    };
    fileButton.click();
}

export default {
    showOpenDialog
};
