import type {FileDataLike} from './file-data';
import platform from '~/app/platform';
import {createDate} from '~/app/utils/date-helper';
import {ProfileModule} from '~/app/entries/vars/ProfileModule';
import {FileDataModule} from '~/app/entries/vars/FileDataModule';
import {FilesStoreModule} from '~/app/entries/vars/FilesStoreModule';

const {default: filesStore, getFileData} = FilesStoreModule;
const {default: FileData} = FileDataModule;
const {getCurrentUser} = ProfileModule;

/**
 * 平台提供的网络功能访问对象
 */
const platformNetwork = platform.access<typeof platform.modules.net>('net');

/**
 * 上传下载进度变更通知最小时间间隔，单位毫秒
 */
const MIN_PROGRESS_CHANGE_INTERVAL = 1000;

/**
 * 检查文件大小是否支持上传到当前服务器
 * @param size 文件大小，单位字节
 * @returns 如果返回 `true` 则为支持，否则为不支持
 */
export function checkUploadFileSize(size: number): boolean {
    const user = getCurrentUser();
    if (!size || size <= 0 || !user) {
        return false;
    }
    const {uploadFileSize} = user;
    return Boolean(uploadFileSize && size <= uploadFileSize);
}

/**
 * 上传文件
 * @param file 要上传的文件对象
 * @param onProgress 文件上传进度变更回调函数
 * @param copyCache 是否将文件拷贝到用户缓存目录
 * @param  beforeSend 上传之前的回调函数
 * @returns 异步返回上传结果
 */
export const uploadFile = async (
    fileLike: FileData|FileDataLike,
    options: Partial<{
        copyCache: boolean,
        onProgress: (progress: number, file: FileData, loaded: number) => void,
        beforeSend: (xhr: XMLHttpRequest) => void
    }> = {}
) => {
    const {onProgress, copyCache, beforeSend} = options;
    const file = FileData.create(fileLike);
    if (!file.gid) {
        throw (new Error('Upload file failed, because gid has not set.'));
    }

    // 检查是否有相同文件正在上传
    const oldFile = filesStore.getFile(file.gid);
    if (oldFile?.networking.isUploading) {
        return oldFile;
    }

    file.networking.startUpload();
    filesStore.store(file);

    try {
        let progressTime = 0;
        let lastProgress = 0;
        const handleProgressChange = (progress: number, loaded: number, total: number) => {
            const now = Date.now();
            if (progress !== lastProgress && (now - progressTime) > MIN_PROGRESS_CHANGE_INTERVAL) {
                progressTime = now;
                lastProgress = progress;
                if (onProgress) {
                    onProgress(progress, file, loaded);
                }
                file.networking.updateUploadLoaded(loaded, total);
            }
        };
        const uploadedFile = await platformNetwork.uploadFile(getCurrentUser(), file, {onProgress: handleProgressChange, copyCache, beforeSend});
        const {id, time, hasThumb, thumbnailWidth, thumbnailHeight} = uploadedFile;
        file.networking.finishUploadSuccess({
            id, time: createDate(time).getTime(), hasThumb, thumbnailWidth, thumbnailHeight
        });
    } catch (error) {
        file.networking.finishUploadFail(error);
        throw error;
    }
    return file;
};

/**
 * 重新上传文件
 * @param file 要上传的文件对象
 * @returns 异步返回上传结果
 */
export const reuploadFile = (file: FileData) => uploadFile(file);

/**
 * 上传图片文件
 * @param file 要上传的文件对象
 * @param onProgress 文件上传进度变更回调函数
 * @returns 异步返回上传结果
 */
export const uploadImageFile = (file: FileData, onProgress: (progress: number, file: FileData, loaded: number) => void) => uploadFile(file, {onProgress, copyCache: true});

/**
 * 下载文件
 * @param file 要下载的文件对象
 * @param onProgress 文件下载进度变更回调函数
 * @param isThumb 是否为缩略图
 * @param disableCache是否跳过缓存
 * @returns 异步返回下载结果
 */
export const downloadFile = async (
    file: FileData,
    options: Partial<{
        onProgress: (progress: any, loaded: any, total: any) => void;
        isThumb: boolean;
        disableCache: boolean;
    }> = {}
) => {
    const {onProgress, isThumb = false, disableCache = false} = options;
    file = FileData.create(file);
    if (!file.gid || !file.id) {
        throw (new Error('Download file failed, because gid or id has not set.'));
    }

    // 检查是否有相同文件正在下载
    const oldFile = filesStore.getFile(file.gid);
    if (oldFile?.networking.isDownloading) {
        return oldFile;
    }

    file.networking.startDownload();
    filesStore.store(file);

    try {
        let progressTime = 0;
        let lastProgress = 0;
        const handleProgressChange = (progress: number, loaded: number, total: number) => {
            const now = Date.now();
            if (progress !== lastProgress && (now - progressTime) > MIN_PROGRESS_CHANGE_INTERVAL) {
                progressTime = now;
                lastProgress = progress;
                if (onProgress) {
                    onProgress(progress, file, loaded);
                }
                file.networking.updateDownloadLoaded(loaded, total);
            }
        };
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Download file failed, user is not logged in.');
        }
        await platformNetwork.downloadFile(user, file, {onProgress: handleProgressChange, isThumbnail: isThumb, disableCache});
        file.networking.finishDownloadSuccess();
    } catch (error) {
        file.networking.finishDownloadFail(error);
    }

    return file;
};

/**
 * try catch 下载文件
 * @param file 要下载的文件对象
 * @returns 使用 Promise 返回 FileData，出错时无返回
 */
export const downloadFileNoThrows = async (file: FileData) => {
    const {cachePath} = file;

    try {
        if (cachePath) {
            const isExists = await file.checkCachePath();
            if (!isExists) {
                return await downloadFile(file);
            }
        } else {
            return await downloadFile(file);
        }
    } catch (error) {
        if (DEBUG) {
            console.warn('DownloadFile error', error);
        }
    }
};

/**
 * 取消上传文件，如果已经上传失败
 * @param gid 上传文件对象的 gid
 */
export const abortUploadFile = (gid: string) => {
    const file = getFileData(gid);
    if (file.networking.isUploading) {
        platformNetwork.abortUploadFile(file.gid);
    }
};

/**
 * 移除上传失败的文件
 * @param gid 上传文件对象的 gid
 * @returns 如果为 `true` 表示操作成功
 */
export function dismissUploadFailedFile(gid: string) {
    const file = getFileData(gid);
    if (file.networking.isUploadFail) {
        file.networking.reset();
        filesStore.deleteCacheItem(file.gid);
    }
}

/**
 * 取消下载文件
 * @param url 下载文件对象的 gid
 * @returns  如果为 `true` 表示取消成功
 */
export const {abortDownloadFile} = platformNetwork;

/**
 * 检查文件是否已缓存
 * @param file 要检查的文件对象
 * @returns 异步返回结果
 */
export const checkFileCache = (file: FileData) => (platformNetwork.checkFileCache ? platformNetwork.checkFileCache(file, getCurrentUser()) : false);

export default {
    downloadFile,
    uploadFile,
    uploadImageFile,
    checkUploadFileSize,
    checkCache: checkFileCache,
    abortUploadFile,
    abortDownloadFile,
    reuploadFile,
    dismissUploadFailedFile,
    downloadFileNoThrows,
};
