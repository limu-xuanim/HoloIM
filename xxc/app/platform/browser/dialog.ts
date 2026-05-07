import {showOpenDialog} from '../common/open-file-button';

/**
 * 显示文件保存对话框
 * @param options 选项
 * @param callback 保存完成后的回调函数，其中参数 `result` 为是否成功保存文件
 */
export const showSaveDialog = (options: {fileUrl: string;}, callback: (result: boolean) => void) => {
    if (options.fileUrl) {
        window.open(options.fileUrl);
        callback?.(true);
    } else {
        if (DEBUG) {
            console.warn('Cannot save file without file url definition');
        }
        callback?.(false);
    }
};

export default {
    showSaveDialog,
    showOpenDialog,
};
