import md5 from 'md5';
import {matchScore} from '~/app/utils/search-score';
import {stringifySearchParams} from '~/app/utils/html-helper';
import {FileNetworking} from './file-networking';
import {dataURItoBlob, convertLocalPathToUrl} from './files-helper';
import platform from '~/app/platform';
import {createDate} from '~/app/utils/date-helper';
import Config from '~/app/config';
import {convertBytes} from '~/app/utils/string-helper';
import type {ElectronPlatform} from '~/app/platform/electron';
import {getCurrentUserID, getCurrentUser} from '~/app/core/profile';

/**
 * 文件数据对象
*/
type FileDataOptions = {
    /**
     * GID
     */
    gid: string;
    /**
     * ID
     */
    id: number;
    /**
     * 名称
     */
    name: string;
    /**
     * 时间戳
     */
    time: number;
    /**
     * 文件大小，单位字节
     */
    size: number;
    /**
     * 媒体宽度
     */
    width: number;
    /**
     * 媒体高度
     */
    height: number;
    /**
     * 是否有缩略图
     */
    hasThumb: boolean;
    /**
     * 发送者 ID
     */
    senderId: number;
    /**
     * 发送文件的调用方法
     */
    sendMethod: 'sendImageMessage';
    /**
     * MIME 类型
     */
    type: string;
    /**
     * 已发送的字节数，如果为 true，表示已完成发布
     */
    send: number|boolean;
    /**
     * 对应的消息 ID
     */
    messageID: number;
    /**
     * 所属消息类型
     */
    messageType: 'image'|'file';
    /**
     * 本地缓存文件路径
     */
    cachePath: string;
    /**
     * 本地缓存缩略图文件路径
     */
    cacheThumbnailPath: string;
    /**
     * 网络传输状态对象
    */
    networking: FileNetworking;
    /**
     * 媒体类型
     */
    mediaType: ''|'image'|'video'|'audio';
    /**
     * 原始文件
     */
    originFile: string|File|Blob;
    /**
     * 远程下载地址
     */
    url: string;
    /**
     * 缩略图宽度
     */
    thumbnailWidth: number;
    /**
     * 缩略图高度
     */
    thumbnailHeight: number;
    /**
     * cgid
     */
    cgid: string;
    /**
     * 存储类型
     */
    storageType: string;
    /**
     * 是否可编辑
     */
    editable: boolean;
};

export type FileDataLike = File|Blob|ChatMessage|(({base64: string;}|{file: File;}|{blob: Blob;})&Partial<FileDataOptions>);

type FileDataChangeListener = (newFile: FileData, oldFile: FileData, changes: Partial<FileDataOptions>) => void;

/** 可内建预览的类型（当前仅聊天图片） */
type FilePreviewType = 'image';

/** 本地缓存是否存在 */
const isLocalCacheEnabled = platform.isElectron;
const fs = platform.access<ElectronPlatform['fs']>('fs');

/**
 * 判断本地文件是否存在
 * @param path 要判断的文件路径
 * @returns 如果返回 `true` 则存在
 */
function checkPathExists(path: string): Promise<boolean> {
    if (isLocalCacheEnabled) {
        return fs.pathExists(path);
    }
    return Promise.resolve(false);
}

/**
 * 搜索匹配分值表
 */
export const MATCH_SCORE_MAP = [
    {name: 'name', equal: 100, include: 50},
    {name: 'category', equal: 100, prefix: ':'},
    {name: 'cgid', equal: 100, prefix: '#'},
    {name: 'senderId', equal: 100, prefix: '@'},
    {name: 'extName', equal: 100, prefix: '.'},
];

/**
 * 文件类型表
 */
export const CATEGORIES = [
    {name: 'doc', like: new Set(['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'key', 'page', 'number', 'pdf', 'txt', 'md', 'rtf', 'wps', 'html', 'htm', 'chtml', 'epub', ''])},
    {name: 'image', like: new Set(['jpg', 'jpeg', 'sketch', 'psd', 'png', 'apng', 'webp', 'gif', 'tiff', 'ico', 'icns', 'svg', 'bmp'])},
    {name: 'media', like: new Set(['mp4', 'webm', 'ogm', 'ogv', 'avi', 'mp3', 'avm', 'ogg', 'opus'])},
    {name: 'program', like: new Set(['js', 'exe', 'app', 'dmg', 'msi', 'bat', 'sh'])}
];

/**
 * 与聊天图片展示/大图预览相关的扩展名（非图片类文件的「预览」已移除）
 */
export const PREVIEW_TYPES = {
    image: new Set(['jpg', 'jpeg', 'png', 'apng', 'webp', 'gif', 'ico', 'icns', 'svg', 'bmp']),
};

/**
 * 文件对象
 */
export default class FileData {
    _data: Partial<FileDataOptions>;

    _onChange: FileDataChangeListener;

    _viewUrl: string;

    _extName: string;

    _category: string;

    _previewType: FilePreviewType;

    public expired: boolean;

    public userSavePath: string;

    /**
     * 创建一个文件对象
     * @param fileData 文件数据对象
     */
    constructor(fileData: Partial<FileDataOptions>) {
        const data = {...fileData};

        if (data.time) {
            data.time = createDate(data.time).getTime();
        }

        if (data.mediaType === 'image' || data.messageType === 'image') {
            this._previewType = 'image'
        }

        /**
         */
        this._data = data;

        /**
         */
        this._onChange = null;
    }

    /**
     * 文件 ID
     */
    get id() {
        return this._data.id;
    }

    /**
     * 文件 GID
     */
    get gid() {
        return this._data.gid;
    }

    /**
     * 文件名称
     */
    get name() {
        return this._data.name;
    }

    /**
     * 文件时间戳
     */
    get time() {
        return this._data.time;
    }

    /**
     * 是否有缩略图
     */
    get hasThumb() {
        return this._data.hasThumb;
    }

    /**
     * 缩略图宽度
     */
    get thumbnailWidth() {
        return this._data.thumbnailWidth;
    }

    /**
     * 缩略图高度
     */
    get thumbnailHeight() {
        return this._data.thumbnailHeight;
    }

    /**
     * 此文件所属的消息 ID
     */
    get messageID() {
        return this._data.messageID;
    }

    /**
     * 此文件所属的消息类型
     */
    get messageType() {
        return this._data.messageType;
    }

    /**
     * 此文件所属的会话 GID
     */
    get cgid() {
        return this._data.cgid;
    }

    /**
     * 获取存储类型
     */
    get storageType() {
        if (this._data.storageType) {
            return this._data.storageType;
        }
        if (this.mediaType === 'image') {
            return 'image';
        }
        if (this.isMedia) {
            return 'media';
        }
        return 'other';
    }

    /**
     * 获取内部存储文件名
     */
    get storageName() {
        return `${this.gid}.${this.extName}`;
    }

    /**
     * 获取内部存储缩略图文件名
     */
    get storageThumbnailName() {
        return this.hasThumb ? `${this.gid}_thumb.${this.extName}` : this.storageName;
    }

    /**
     * 已发送的字节数
     */
    get send() {
        return this._data.send;
    }

    /**
     * 文件是否发送成功
     */
    get isOK() {
        return this._data.send === true;
    }

    /**
     * 本地缓存文件路径
     */
    get cachePath() {
        if (!isLocalCacheEnabled) {
            return null;
        }
        return this._data.cachePath;
    }

    /**
     * 本地缓存缩略图文件路径
     */
    get cacheThumbnailPath() {
        if (!isLocalCacheEnabled) {
            return null;
        }
        if (!this.hasThumb) {
            return this.cachePath;
        }
        return this._data.cacheThumbnailPath;
    }

    /**
     * 是否超出自动下载大小
     */
    get exceedAutoDownloadSize() {
        const maxDownloadSize = Config.ui['chat.image.autoDownloadSize'];
        return this.size > convertBytes(maxDownloadSize);
    }

    /**
     * 是否需要静默下载原图
     */
    get needAutoLoadOriginImage() {
        return this.hasThumb && !this?.cachePath && !this.exceedAutoDownloadSize;
    }

    /**
     * 是否需要展示加载原图按钮
     */
    get needLoadIamgeBtn() {
        return this.previewType === 'image' && this.hasThumb && this.exceedAutoDownloadSize && !this?.cachePath;
    }

    /**
     * 网络传输状态对象
     */
    get networking() {
        if (!this._data.networking) {
            this._data.networking = new FileNetworking(this);
        }
        return this._data.networking;
    }

    /**
     * 发送者 ID
     */
    get senderId() {
        return this._data.senderId;
    }

    /**
     * 文件大小，单位字节
     */
    get size() {
        return this._data.size;
    }

    /**
     * 获取文件发送的函数，用以区分文件一开始的发送调用函数（当前仅为 sendImageMessage）。
     */
    get sendMethod() {
        return this._data.sendMethod;
    }

    /**
     * 设置发送文件的函数
     */
    set sendMethod(value) {
        this._data.sendMethod = value;
    }

    /**
     * 原始文件对象
     */
    get originFile() {
        return this._data.originFile;
    }

    /**
     * MIME 类型
     */
    get mimeType() {
        return this._data.type || '';
    }

    /**
     * 媒体文件类型
     */
    get mediaType() {
        const {mediaType} = this._data;
        if (mediaType) {
            return mediaType;
        }
        if (this.previewType === 'image') {
            return 'image';
        }
        return '';
    }

    /**
     * 媒体宽度
     */
    get mediaWidth() {
        return this._data.width || 0;
    }

    /**
     * 媒体高度
     */
    get mediaHeight() {
        return this._data.height || 0;
    }

    /**
     * 是否为媒体文件
     */
    get isMedia() {
        return !!this.mediaType;
    }

    /**
     * 是否为base64图片
     */
    get isBase64() {
        return this.mimeType === 'base64';
    }

    /**
     * 媒体文件信息
     */
    get mediaInfo() {
        const {mediaType} = this;
        if (!mediaType) {
            return null;
        }
        return {
            type: mediaType,
            width: this.mediaWidth,
            height: this.mediaHeight,
        };
    }

    /**
     * 原始文件对象类型
     */
    get originFileType() {
        const {originFile} = this;
        if (originFile instanceof File) {
            return 'file';
        }
        if (originFile instanceof Blob) {
            return 'blob';
        }
        if (typeof originFile === 'string') {
            return 'base64';
        }
        return '';
    }

    /**
     * 原始文件路径
     */
    get originFileUrl() {
        const {originFile} = this;
        if (!originFile) {
            return null;
        }
        if (typeof originFile === 'string') {
            const blob = dataURItoBlob(originFile);
            return URL.createObjectURL(blob);
        }
        if ((originFile as File)?.path) {
            return convertLocalPathToUrl((originFile as File).path);
        }
        if (originFile instanceof File || originFile instanceof Blob) {
            return URL.createObjectURL(originFile);
        }
        return null;
    }

    /**
     * 远程访问地址（下载地址）
     */
    get remoteUrl() {
        return this.getRemoteUrl();
    }

    /**
     * 缩略图远程访问地址（下载地址）
     */
    get thumbnailRemoteUrl() {
        return this.getRemoteUrl({isThumbnail: this.hasThumb});
    }

    /**
     * 获取远程访问地址
     * @param options 选项
     * @param options.preview 是否为预览模式
     * @param options.isThumbnail 是否为缩略图
     * @param options.withSid 是否携带 sid
     * @returns 下载地址
     */
    getRemoteUrl(options: Partial<{preview: boolean; isThumbnail: boolean; withSid: boolean;}> = {}) {
        if (this._data.url) {
            return this._data.url;
        }
        if (!this.id) {
            return null;
        }
        const user = getCurrentUser();
        const {preview = !!this.previewType, isThumbnail, withSid = true} = options;
        const params: Record<string, string> = {
            fileName: isThumbnail ? `thumb_${this.name}` : this.name,
            time: String(Math.floor(this.time / 1000)),
            id: String(this.id),
            gid: String(user.id)
        };

        if (user.serverName) {
            params.ServerName = user.serverName;
        }
        if (platform.isBrowser || withSid) {
            params.sid = md5(user.sessionID + (isThumbnail ? `thumb_${this.name}` : this.name));
        }

        if (preview) {
            params.preview = '1';
        }
        return user.makeServerUrl(`fileDownload?${stringifySearchParams(params)}`);
    }

    /**
     * 用于在界面上引用的地址（在桌面平台，仅使用本地缓存文件地址，如果没有缓存文件返回 null，在浏览器上缓存文件不可用时使用 thumbnailRemoteUrl
     */
    get thumbnailViewUrl() {
        if (!this.hasThumb) {
            return this.viewUrl;
        }

        if (isLocalCacheEnabled) {
            const {cacheThumbnailPath} = this;
            if (cacheThumbnailPath) {
                return convertLocalPathToUrl(cacheThumbnailPath);
            }
            const {originFileUrl} = this;
            if (originFileUrl) {
                return originFileUrl;
            }
            return null;
        }

        return this.thumbnailRemoteUrl;
    }

    /**
     * 用于在界面上引用的地址（在桌面平台，仅使用本地缓存文件地址，如果没有缓存文件返回 null，在浏览器上缓存文件不可用时使用 remoteUrl）
     */
    get viewUrl() {
        if (this._viewUrl) {
            return this._viewUrl;
        }

        const {originFileUrl} = this;
        if (originFileUrl) {
            this._viewUrl = originFileUrl;
            return originFileUrl;
        }

        this._viewUrl = null;

        if (isLocalCacheEnabled) {
            const {cachePath} = this;
            if (cachePath) {
                this._viewUrl = convertLocalPathToUrl(cachePath);
                return this._viewUrl;
            }
            return null;
        }

        return this.remoteUrl;
    }

    /**
     * 获取文件扩展名，例如 `'txt'`
     */
    get extName() {
        if (this._extName === undefined) {
            const {name} = this;
            if (typeof name !== 'string' || !name.length) {
                return '';
            }
            const dotIndex = name.lastIndexOf('.');
            this._extName = dotIndex > -1 ? name.substr(dotIndex + 1) : '';
        }
        return this._extName;
    }

    /**
     * 获取获取文件所属类型
     */
    get category() {
        if (!this._category) {
            this._category = 'other';
            const {extName} = this;
            if (extName) {
                for (const cat of CATEGORIES) {
                    if (cat.like.has(extName)) {
                        this._category = cat.name;
                        break;
                    }
                }
            }
        }
        return this._category;
    }

    /**
     * 获取文件预览类型
     */
    get previewType() {
        if (this._previewType === undefined) {
            const {extName} = this;
            if (extName) {
                for (const [name, types] of Object.entries(PREVIEW_TYPES)) {
                    if (types.has(extName.toLowerCase())) {
                        this._previewType = name as keyof typeof PREVIEW_TYPES;
                        break;
                    }
                }
            }
        }
        return this._previewType;
    }

    /**
     * 文件是否在本地
     */
    get isInLocal() {
        return !this.id && !this.messageID;
    }

    /**
     * 文件是否在服务器
     */
    get isInRemote() {
        return !!this.id;
    }

    /**
     * 是否由当前用户发送
     */
    get isSendByMe() {
        return this.senderId === getCurrentUserID();
    }

    /**
     * 文件是否可以编辑 (针对 Collabora 文档文件)
     * @param value 是否可以编辑
     */
    set editable(value: boolean) {
        this._data.editable = !!value;
    }

    /**
     * 文件是否可以编辑 (针对 Collabora 文档文件)
     */
    get editable() {
        return !!this._data.editable;
    }

    /**
     * 设置文件变更回调函数
     */
    set onChange(onChangeListener: FileDataChangeListener) {
        this._onChange = onChangeListener;
    }

    change<K extends keyof FileDataOptions>(key: K, value: FileDataOptions[K]): boolean;

    change(newData: Partial<FileDataOptions>): boolean;

    /**
     * 变更数据
     * @param newData 新的文件数据对象或要变更的属性名
     * @param value 要变更的属性值
     * @returns 是否发生变更
     */
    change<K extends keyof FileDataOptions>(newData: Partial<FileDataOptions>|K, value?: FileDataOptions[K]) {
        if (typeof newData === 'string') {
            return this.change({[newData]: value});
        }

        // 执行浅比较，仅更新值不一致的属性
        const changes = Object.keys(newData).reduce(<Key extends keyof FileDataOptions>(data: Partial<FileDataOptions>, key: Key) => {
            const oldValue = this._data[key];
            const newValue = newData[key];
            if (oldValue !== newValue) {
                data[key] = newValue;

                if (key === 'cachePath') {
                    delete this._viewUrl;
                }
            }
            return data;
        }, {} as Partial<FileDataOptions>);

        return this.forceChange(changes);
    }

    /**
     * 强制变更数据，并触发 onChange 回调
     * @param changes 要变更的数据对象
     * @returns 是否发生变更
     */
    forceChange(changes: Partial<FileDataOptions>) {
        if (Object.keys(changes).length) {
            Object.assign(this._data, changes);
            const oldFile = new FileData({...this._data});
            this._onChange?.(this, oldFile, changes);
            return true;
        }
        return false;
    }

    /**
     * 设置缓存文件路径
     * @param cachePath 缓存文件路径
     * @param thumbnail 是否为缩略图文件
     */
    setCachePath(cachePath: string, thumbnail = false) {
        if (!isLocalCacheEnabled) {
            return;
        }
        if (this.hasThumb && thumbnail) {
            this.change({cacheThumbnailPath: cachePath});
        } else {
            this.change({cachePath});
        }
    }

    /**
     * 检查缓存文件是否存在
     * @param isThumbnail 是否为缩略图
     * @returns 使用 Promise 异步返回处理结果
     */
    async checkCachePath(isThumbnail = false) {
        if (!isLocalCacheEnabled) {
            return false;
        }

        const {cachePath, cacheThumbnailPath, hasThumb} = this;
        isThumbnail = hasThumb && isThumbnail;

        const path = isThumbnail ? cacheThumbnailPath : cachePath;
        if (!path) {
            return false;
        }

        try {
            const isExist = await checkPathExists(path);
            if (!isExist) {
                this.change({[(isThumbnail ? 'cacheThumbnailPath' : 'cachePath')]: ''});
            }
            return isExist;
        } catch (_error) {
            return false;
        }
    }

    /**
     * 获取用于发送到服务器的文件数据对象
     * @returns 数据对象
     */
    plain() {
        const plainData = ['gid', 'id', 'name', 'isImage', 'senderId', 'send', 'height', 'width', 'size', 'time', 'type', 'hasThumb', 'thumbnailWidth', 'thumbnailHeight', 'editable'].reduce(<K extends keyof FileDataOptions>(data: Partial<FileDataOptions>, key: K) => {
            const value = this._data[key];
            if (value !== undefined) {
                data[key] = value;
            }
            return data;
        }, {} as Partial<FileDataOptions>);

        if (plainData.send === undefined) {
            const {networking} = this;
            if (networking.isNetworking) {
                plainData.send = networking.loaded;
            } else if (networking.isFinished) {
                plainData.send = !networking.error;
            }
        }
        return plainData;
    }

    /**
     * 获取文件与给定的关键字匹配分值
     * @param keys 关键字列表
     * @returns 匹配的分值
     */
    getMatchScore(keys: string[]) {
        return matchScore(MATCH_SCORE_MAP, this, keys);
    }

    /**
     * 从 File 对象创建 FileData
     * @param file 文件对象
     * @param data 其他文件数据
     * @returns 文件数据对象
     */
    static fromFile(file: File, data: Partial<FileDataOptions> = {}) {
        return new FileData({
            originFile: file,
            cachePath: file.path,
            name: file.name,
            size: file.size,
            send: 0,
            type: file.type,
            time: Date.now(),
            ...data
        });
    }

    /**
     * 从 Blob 对象创建 FileData
     * @param blob 文件对象
     * @param data 其他文件数据
     * @returns 文件数据对象
     */
    static fromBlob(blob: Blob, data: Partial<FileDataOptions> = {}) {
        return new FileData({
            originFile: blob,
            name: '',
            size: blob.size,
            send: 0,
            type: blob.type,
            time: Date.now(),
            ...data
        });
    }

    /**
     * 从 base64 创建 FileData
     * @param base64 base64
     * @param data 其他文件数据
     * @returns 文件数据对象
     */
    static fromBase64(base64: string, data = {}) {
        if (!base64) {
            throw new Error('base64 is empty');
        }
        const base64MimeType = base64.split(';')[0].split(':')[0];
        const blob = dataURItoBlob(base64);
        return FileData.fromBlob(blob, {...data, type: base64MimeType});
    }

    /**
     * 从消息对象创建 FileData
     * @param message 消息对象
     * @returns 文件数据对象
     */
    static fromMessage(message: ChatMessage) {
        let fileContent = message.imageContent;
        if (!fileContent) {
            fileContent = {
                senderId: message.senderId,
                originFile: message.attachFile,
                time: message.sendTime,
                cachePath: message.cacheFilePath,
                messageID: message.id,
                messageType: message.contentType === 'image' ? 'image' : 'file',
                cgid: message.cgid,
                // 以 message 内容为准，防止值被覆盖，如 time 字段应该优先使用 message 内容中的值，而非 message.sendTime
                ...JSON.parse(message.content),
            };
        }
        if (fileContent.type === 'base64') {
            return FileData.fromBase64(fileContent.content ?? fileContent.originFile, fileContent);
        }
        return new FileData(fileContent);
    }

    /**
     * 创建 FileData
     * @param data 文件数据定义对象
     * @returns 文件数据对象
     */
    static create(data: FileData|FileDataLike): FileData {
        if (!data || typeof data !== 'object') {
            throw new Error('Cannot create FileData, the "data" param is not an object');
        }

        if (data instanceof FileData) {
            return data;
        }

        if (data instanceof File) {
            return FileData.fromFile(data);
        }

        if (data instanceof Blob) {
            return FileData.fromBlob(data);
        }

        if ('base64' in data && data.base64) {
            const {base64, ...others} = data;
            return FileData.fromBase64(base64, others);
        }

        if ('blob' in data && data.blob) {
            const {blob, ...others} = data;
            return FileData.fromBlob(blob, others);
        }

        if ('file' in data && data.file) {
            const {file, ...others} = data;
            return FileData.fromFile(file, others);
        }

        if ('entityType' in data && data.entityType === 'ChatMessage') {
            return FileData.fromMessage(data);
        }

        return new FileData(data);
    }
}
