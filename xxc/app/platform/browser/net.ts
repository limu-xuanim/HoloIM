import net, {type PlatformNetwork} from '../common/network';

/**
 * 浏览器上下载文件直接在浏览器中打开下载地址即可
 * @param _ 用户实例
 * @param file 文件对象
 * @returns 文件对象
 */
function downloadFile(
    _: User,
    file: FileData,

    _options: Partial<{
        onProgress: (progress: number, receivedLength: number, total: number) => void,
        disableCache: boolean
    }> = {}
) {
    return Promise.resolve(file);
}

/**
 * 浏览器上上传文件到服务器
 * @param user 当前用户
 * @param file 要上传的文件对象
 * @param onProgress 上传进度变更的回调函数
 * @param _copyCache 是否将原始文件拷贝到缓存目录
 * @param beforeSend 上传之前的回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
function uploadFile(
    user: User,
    file: FileData,
    options: Partial<{
        copyCache: boolean,
        onProgress: (progress: number, loaded: number, total: number) => void,
        beforeSend: (xhr: XMLHttpRequest, file: FileData, serverUrl: string) => void,
    }> = {}
) {
    const {onProgress = null, beforeSend = null} = options;
    const {originFile} = file;
    if (!originFile) {
        console.warn('Upload file fail, cannot get origin file object.', file);
        return;
    }
    const serverUrl = user.uploadUrl;
    const form = new FormData();
    form.append('file', file.originFile as File|Blob, file.name);
    form.append('userID', user.id.toString());
    form.append('gid', file.cgid);
    return net.uploadFile(file, serverUrl, {
        beforeSend: xhr => {
            xhr.setRequestHeader('ServerName', user.serverName);
            xhr.setRequestHeader('Authorization', user.token);
            if (beforeSend) {
                beforeSend(xhr, file, serverUrl);
            }
        },
        onProgress,
        form
    });
}

export default {
    ...net,
    downloadFile,
    uploadFile,
} as PlatformNetwork;
