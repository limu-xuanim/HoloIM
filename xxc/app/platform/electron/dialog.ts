import fs from './fs';
import env from './env';
import {showOpenDialog} from '../common/open-file-button';
import {downloadFileWithRequest} from './net';

/**
 * 上次在文件保存对话框中选择的文件保存位置
 */
let lastFileSavePath = '';

/**
 * 显示文件保存对话框
 * @param options 选项
 * @param callback 保存完成后的回调函数，其中参数 `filePath` 为保存文件的路径
 * @returns 使用异步返回选择保持的文件路径
 */
export const showSaveDialog = async (
    options: Electron.SaveDialogOptions&Partial<{sourceFilePath: string; filename: string;}> = {},
    callback: ((filePath?: string | null) => void) | null = null
): Promise<string | null> => {
    if (options.sourceFilePath) {
        const {sourceFilePath} = options;
        delete options.sourceFilePath;
        return showSaveDialog(options, filename => {
            if (filename) {
                if (sourceFilePath === filename) {
                    callback?.(filename);
                } else {
                    fs.copy(sourceFilePath, filename)
                        .then(() => {
                            if (callback) {
                                callback(filename);
                            }
                            return filename;
                        }).catch(callback);
                }
            } else if (callback) {
                callback();
            }
        });
    }

    let filename = options.filename || '';
    delete options.filename;
    filename &&= window.nodeAPI.pathBasename(filename);

    options = {defaultPath: window.nodeAPI.pathJoin(lastFileSavePath || env.desktopPath, filename), ...options};
    const result = await window.electronAPI.showSaveDialog(options);
    const filePath = !result.canceled ? result.filePath : null;
    if (filePath) {
        lastFileSavePath = window.nodeAPI.pathDirname(filePath);
    }
    callback?.(filePath);
    return filePath;
};

/**
 * 显示保存文件对话框
 * @param content 文件内容
 * @param options 选项
 * @param callback 回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export const showSaveFileDialog = async (content: string|((fileName: string) => string), options: object, callback: ((fileName?: string | null) => void) | null = null) => {
    const fileName = await showSaveDialog(options);
    if (fileName) {
        if (typeof content === 'function') {
            content = content(fileName);
        }
        await fs.outputFile(fileName, content);
    }
    if (callback) {
        callback(fileName);
    }
};

/**
 * 根据图片地址、存储类型、扩展名及文件名称保存图片
 * @param url 图片地址
 * @param dataType 图片类型
 * @param fileExt  图片扩展名
 * @param fileName 图片名称
 * @returns 使用 Promise 异步返回处理结果
 */
export const saveAsImageFromUrl = (url: string, dataType?: string, fileExt = '', fileName = ''): Promise<string> => new Promise((resolve, reject) => {
    const isBase64Image = url.startsWith('data:image/') || dataType === 'base64';
    const isBlob = url.startsWith('blob:');
    const isHttp = url.startsWith('http://') || url.startsWith('https://');
    if (!isBase64Image && url.startsWith('file://')) {
        url = url.substring(7);
    }
    const name = fileName || ((isBase64Image || isBlob || isHttp) ? 'xuanxuan-image.png' : window.nodeAPI.pathBasename(url));
    const extName = fileExt || (window.nodeAPI.pathExtname(name).replace(/^\./, '') ?? '*');
    showSaveDialog({
        filename: name,
        // http/https 链接不能按本地路径拷贝，统一走下载逻辑
        sourceFilePath: (isBase64Image || isBlob || isHttp) ? undefined : url,
        filters: [{name: 'Image', extensions: [extName]}],
    }, (filenameParam?: string | null) => {
        const filename = filenameParam || '';
        if (filename) {
            if (isBase64Image) {
                const image = window.electronAPI.nativeImageCreateFromDataURL(url);
                fs.outputFileSync(filename, image.toPNG());
            } else if (isBlob || isHttp) {
                return downloadFileWithRequest(url, filename).then(() => {
                    resolve(filename);
                    return filename;
                }).catch(reject);
            }
        }
        resolve(filename);
    });
});

const dialog = {
    showSaveDialog,
    showOpenDialog,
    saveAsImageFromUrl,
    showSaveFileDialog
};

export default dialog;

export type Dialog = typeof dialog;
