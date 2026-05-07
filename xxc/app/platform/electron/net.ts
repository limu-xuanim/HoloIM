import to from 'await-to-js';
import fse from './fs';
import network, {type PlatformNetwork, uploadFile as uploadFileOrigin} from '../common/network';
import {checkFileCache, createCachePath, filesCache} from './file-cache';
import CodedError, {Codes} from '../../utils/coded-error';

/**
 * 写文件
 * @param reader Reader
 * @param total 文件大小
 */
const writeFile = (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    total: number,
    fileSavePath: string,
    onProgress: (progress: number, receivedLength: number, total: number) => void
): Promise<void> => {
    let receivedLength = 0;
    let curByteLength = 0;
    let truncWrite = true;
    let bufferArray: Buffer[] = [];
    const execWrite = () => {
        fse.outputFileSync(fileSavePath, window.nodeAPI.BufferConcat(bufferArray), {flag: truncWrite ? 'w' : 'a'});
        curByteLength = 0;
        bufferArray = [];
        truncWrite = false;
    };
    return new Promise((resolve, reject) => {
        const pump = () => {
            reader.read().then(({done, value}) => {
                if (done) {
                    if (bufferArray.length) {
                        execWrite();
                    }
                    resolve();
                    return;
                }
                receivedLength += value.byteLength;
                onProgress?.((receivedLength * 100) / total, receivedLength, total);
                curByteLength += value.byteLength;
                bufferArray.push(window.nodeAPI.BufferFrom(value));
                if (curByteLength > 25 * 1024 * 1024) {
                    execWrite();
                }
                pump();
            }).catch(reject);
        };
        pump();
    });
};

/**
 * 下载文件
 * @param url 文件下载地址
 * @param fileSavePath 文件保存路径
 * @param onProgress 下载进度变更事件回调函数
 * @param disableCache 是否跳过缓存
 * @returns 使用 Promise 异步返回处理文件下载结果
 */
export const downloadFileWithRequest = async (
    url: string,
    fileSavePath: string,
    options: Partial<{
        onProgress: (progress: number, receivedLength: number, total: number) => void,
        disableCache: boolean
    }> = {}
) => {
    const {onProgress, disableCache = false} = options;
    if (fileSavePath.toLowerCase().endsWith('.asar')) {
        fileSavePath = `${fileSavePath.substring(0, fileSavePath.length - 4)}_${fileSavePath.substring(fileSavePath.length - 4)}`;
    }

    const res = await fetch(url, {method: 'GET', cache: disableCache ? 'no-cache' : 'default'});
    if (!res.ok) {
        throw new CodedError(Codes.HTTP_STATUS_ERROR, 'Status code is not 200.', {status: res.status, statusMessage: res.statusText});
    }
    return writeFile(res.body.getReader(), +res.headers.get('content-length'), fileSavePath, onProgress);
};

/**
 * 下载并保存文件到本地缓存，该方法不必检查缓存文件，因为本地的缓存文件内容可能已经被修改
 * @param user 用户实例
 * @param file 文件对象
 * @param onProgress 下载进度变更事件回调函数
 * @param isThumbnail 是否为缩略图
 * @param disableCache 是否跳过缓存
 * @returns 使用 Promise 异步返回处理文件下载结果
 */
export const downloadFile = async (
    user: User,
    file: FileData,
    options: Partial<{
        onProgress: (progress: number, receivedLength: number, total: number) => void,
        isThumbnail: boolean,
        disableCache: boolean,
    }> = {}
) => {
    const {onProgress, isThumbnail = false, disableCache = false} = options;
    const {remoteUrl, thumbnailRemoteUrl} = file;
    const url = isThumbnail ? thumbnailRemoteUrl : remoteUrl;
    const fileSavePath = file.userSavePath || createCachePath(file, user, null, isThumbnail);

    fse.ensureDirSync(window.nodeAPI.pathDirname(fileSavePath));
    await downloadFileWithRequest(url, fileSavePath, {onProgress, disableCache});
    if (DEBUG) {
        console.collapse('HTTP DOWNLOAD', 'blueBg', url, 'bluePale', 'OK', 'greenPale');
        console.log('file', file);
        console.groupEnd();
    }
    file.setCachePath(fileSavePath, isThumbnail);
    filesCache.set(file.gid + (isThumbnail ? '_thumb' : ''), fileSavePath);
    return file;
};

/**
 * 上传文件
 * @param user 用户实例
 * @param file 文件对象
 * @param onProgress 上传进度变更事件回调函数
 * @param copyCache 是否将原始文件拷贝到缓存目录
 * @param  beforeSend 上传之前的回调函数
 * @returns 使用 Promise 异步返回处理上传文件结果
 */
export const uploadFile = async (
    user: User,
    file: FileData,
    options: Partial<{
        copyCache: boolean,
        onProgress: (progress: number, loaded: number, total: number) => void,
        beforeSend: (xhr: XMLHttpRequest, file: FileData, serverUrl: string) => void
    }> = {}
) => {
    const {onProgress, copyCache = false, beforeSend = null} = options;
    const {originFile} = file;
    if (!originFile) {
        console.warn('Upload file fail, cannot get origin file object.', file);
        return;
    }

    const form = new FormData();
    form.append('file', originFile as File|Blob, file.name);
    form.append('userID', String(user.id));
    form.append('gid', file.cgid);

    const serverUrl = user.uploadUrl;
    const [error, remoteData] = await to(
        uploadFileOrigin(
            file,
            serverUrl,
            {
                beforeSend: xhr => {
                    xhr.setRequestHeader('ServerName', user.serverName);
                    xhr.setRequestHeader('Authorization', user.token);
                    beforeSend?.(xhr, file, serverUrl);
                },
                onProgress,
                form
            }
        )
    );

    if (error) {
        if (DEBUG) {
            console.error('Upload file error', error, file);
        }
        throw error;
    }

    const finishUpload = () => {
        if (DEBUG) {
            console.collapse('HTTP UPLOAD Request', 'blueBg', serverUrl, 'bluePale', 'OK', 'greenPale');
            console.log('files', file);
            console.log('remoteData', remoteData);
            console.groupEnd();
        }
        return remoteData;
    };
    if (copyCache) {
        const copyPath = createCachePath(file, user, copyCache === true ? file.storageType : copyCache);
        file.setCachePath(copyPath);
        if ((originFile as File).path) {
            fse.copySync((originFile as File).path, copyPath);
            return finishUpload();
        }
        if (originFile instanceof Blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    if (reader.readyState === 2) {
                        const buffer = window.nodeAPI.BufferFrom(reader.result as ArrayBuffer);
                        fse.outputFile(copyPath, buffer)
                            .then(finishUpload)
                            .then(resolve)
                            .catch(reject);
                    }
                };
                reader.readAsArrayBuffer(originFile);
            });
        }
    }
    return finishUpload();
};

export default ({
    ...network,
    uploadFile,
    downloadFile,
    checkFileCache
}) as PlatformNetwork;
