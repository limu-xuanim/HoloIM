import fs from './fs';
import {downloadFileWithRequest} from './net';

/**
 * 将 Base64 字符串转换为 Buffer
 * @param base64Str Base64 字符串
 * @returns Buffer
 */
export const base64ToBuffer = (base64Str: string): Buffer => {
    const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (matches.length !== 3) {
        throw new Error('Invalid base64 image string.');
    }
    return window.nodeAPI.BufferFrom(matches[2], 'base64');
};

/**
 * 从图片路径创建一个 NativeImage 实例
 * @param path 图片路径
 * @returns NativeImage 实例
 */
export const createFromPath = (path: string) => window.electronAPI.nativeImageCreateFromPath(path);

/**
 * 从 DataUrl 字符串创建一个 NativeImage 实例
 * @param dataUrl DataUrl 字符串
 * @returns NativeImage 实例
 */
export const createFromDataURL = (dataUrl: string) => window.electronAPI.nativeImageCreateFromDataURL(dataUrl);

/**
 * 保存图片
 * @param image 图片
 * @param filePath 保存路径
 * @returns 使用 Promise 异步返回处理结果
 */
export const saveImage = async (image: Electron.NativeImage | string | Buffer, filePath: string): Promise<any> => {
    const file: {
        path: string;
        name: string;
        blob?: string;
        base64?: string;
        size?: number;
    } = {
        path: filePath,
        name: window.nodeAPI.pathBasename(filePath),
    };
    if (typeof image === 'string') {
        if (image.startsWith('blob:')) {
            file.blob = image;
            await downloadFileWithRequest(image, filePath);
            return Promise.resolve(file);
        }
        file.base64 = image;
        image = base64ToBuffer(image);
        file.size = image.length;
    } else if (image.toPNG) {
        image = image.toPNG();
        file.size = image.length;
    }
    if (image instanceof Buffer) {
        await fs.outputFile(filePath, image);
        return Promise.resolve(file);
    }
    return Promise.reject(new Error('Cannot convert image to a buffer.'));
};

export default {
    base64ToBuffer,
    saveImage,
    createFromPath,
    createFromDataURL
};
