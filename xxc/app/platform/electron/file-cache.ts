import {createUserDataPath} from 'Platform/os';
import fse from './fs';

/**
 * 文件缓存对象
 */
export const filesCache = new Map<string, string>();

/**
 * 创建文件缓存路径
 * @param file 文件对象
 * @param user 用户实例
 * @param storageType 缓存目录
 * @param isThumbnail 是否为缩略图
 * @returns 创建文件缓存路径
 */
export const createCachePath = (file: FileData, user: User, storageType = file.storageType, isThumbnail = false) => {
    const storageName = isThumbnail ? file.storageThumbnailName : file.storageName;
    return createUserDataPath(user.identify, storageName, (storageType ? storageType === 'images' ? 'images' : `${storageType}s` : 'images'));
};

/**
 * 检查文件是否已经缓存
 * @param file 文件对象
 * @param user 用户实例
 * @param storageType 缓存目录
 * @param isThumbnail 是否为缩略图
 * @returns 使用 Promise 异步返回处理结果
 */
export const checkFileCache = async (file: FileData, user: User, storageType = 'image', isThumbnail = false) => {
    if (file.path || file.editable) {
        return false;
    }

    // 检查文件对象中已存储的缓存文件路径是否存在
    const {cachePath, cacheThumbnailPath} = file;
    const path = isThumbnail ? cacheThumbnailPath : cachePath;
    const fileGid = isThumbnail ? `${file.gid}_thumb` : file.gid;
    if (path) {
        const exists = await fse.pathExists(path);
        if (exists) {
            filesCache.set(fileGid, path);
            return path;
        }
    }

    // 检查当前 filesCache 对象中是否已存在缓存记录
    const oldCachePath = filesCache.get(fileGid);
    if (oldCachePath && oldCachePath !== path) {
        const exists = await fse.pathExists(oldCachePath);
        if (exists) {
            file.setCachePath(oldCachePath, isThumbnail);
            return oldCachePath;
        }
    }

    // 创建新的文件缓存路径，并检查是否存在
    const newCachePath = createCachePath(file, user, storageType, isThumbnail);
    if (newCachePath === oldCachePath) {
        return false;
    }
    const exists = await fse.pathExists(newCachePath);
    if (exists) {
        filesCache.set(fileGid, newCachePath);
        file.setCachePath(newCachePath, isThumbnail);
        return newCachePath;
    }
    return false;
};

/**
 * 从缓存中移除文件，如果文件存在会先尝试删除文件
 * @param file 缓存文件路径或者缓存文件对象
 */
export const removeFileFromCache = (file: FileData) => {
    const {cachePath, cacheThumbnailPath, gid} = file;
    if (cachePath) {
        fse.removeSync(cachePath);
    }
    if (cacheThumbnailPath) {
        fse.removeSync(cacheThumbnailPath);
    }
    if (gid) {
        filesCache.delete(gid);
        filesCache.delete(`${gid}_thumb`);
    } else if (cachePath) {
        const findGid = Object.keys(filesCache).find(x => filesCache.get(x) === cachePath);
        if (findGid) {
            filesCache.delete(findGid);
            filesCache.delete(`${findGid}_thumb`);
        }
    }
};
