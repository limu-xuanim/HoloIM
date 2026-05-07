import {DataStore} from '../db/datastore';
import {setCallbackOnInitedDB} from '../db';
import FileData, {type FileDataLike} from './file-data';
import chatMessagesStore, {queryMessagesFromDatabase} from '../im/chat-messages-store';
import {getCommonDataItem, putCommonDataItem} from '../db/common-data';

/** 会话文件/图片列表默认加载条数上限，避免侧边栏一次加载全部导致卡死 */
const DEFAULT_CHAT_FILES_LIMIT = 100;

class FilesStore extends DataStore<string, FileData, FileDataLike> {
    constructor() {
        super('File', {channelDelayTime: 50, key: 'gid'});

        // 订阅消息变更事件，以便于更新文件数据
        chatMessagesStore.subscribeAny(this._handleMessagesStore.bind(this));

        this._handleFileDataChange = this._handleFileDataChange.bind(this);
    }

    /**
     * 重置数据存储中心
     * @param identify 数据存储标识，通常为当前连接的服务器地址
     */
    override reset(identify: string) {
        const identifyChanged = super.reset(identify);

        if (DEBUG_I) {
            console.collapse('STORE.File', 'pinkBg', 'reset', 'pinkPale', identifyChanged, '');
            console.log('identify', identify);
            console.groupEnd();
        }

        return identifyChanged;
    }

    /**
     * 获取文件数据对象
     * @param gid 文件 GID
     * @returns 文件数据对象
     */
    getFile(gid: string): FileData {
        if (this.hasCacheItem(gid)) {
            return this.getItemFromCache(gid);
        }

        this._cache.set(gid, null);
        return null;
    }

    /**
     * 获取多个文件数据对象
     * @param gids 文件 GID 列表
     * @returns 文件数据对象
     */
    getFiles(gids: string[]): FileData[] {
        return gids.map(this.getFile.bind(this));
    }

    /**
     * 获取消息对应的文件
     * @param message 消息对象或者消息 ID
     * @returns 文件数据对象
     */
    getMessageFile(message: number|ChatMessage): FileData {
        if (typeof message === 'number') {
            message = chatMessagesStore.getMessage(message);
        }
        if (!message) {
            if (DEBUG) {
                console.error(`Cannot get message file from message "${message}".`);
            }
            return null;
        }
        const fileData = FileData.fromMessage(message);
        const oldFile = this.getFile(fileData.gid);
        if (oldFile) {
            return oldFile;
        }
        return this.store(fileData)[0];
    }

    /**
     * 获取会话中的文件
     * @param cgid 文件所属会话 GID
     * @param messageType 文件所属消息类型
     * @param maxCount 最多返回条数，用于侧边栏等展示时避免一次渲染过多导致卡顿
     * @returns 文件列表
     */
    getChatFiles(cgid: string, messageType: '' | 'image' = 'image', maxCount?: number): FileData[] {
        const filter = (file: FileData) => (file.cgid === cgid && file.isInRemote && (!messageType || messageType === file.messageType));
        const sorter = (x: FileData, y: FileData) => y.id - x.id;
        const list = this.filter(filter).sort(sorter);
        return maxCount != null && maxCount > 0 ? list.slice(0, maxCount) : list;
    }

    /**
     * 获取会话中正在传输的文件
     * @param cgid 文件所属会话 GID
     * @returns 文件列表
     */
    getChatUploadingFiles(cgid: string): FileData[] {
        const filter = (file: FileData) => (file.cgid === cgid && file.networking.type === 'uploading' && file.isInLocal);
        const sorter = (x: FileData, y: FileData) => y.time - x.time;
        return this.filter(filter).sort(sorter);
    }

    /**
     * 存储文件数据对象
     * @param files 文件数据对象列表
     * @returns 文件数据对象
     */
    store(fileLikes: FileData|FileDataLike|Array<FileData|FileDataLike>): FileData[] {
        const files = super.store(fileLikes, {normalizeFunc: this.normalizeItem});

        if (DEBUG_I) {
            console.collapse('STORE.File', 'pinkBg', 'store', 'pinkPale', files?.length, '');
            console.trace('files', files);
            console.log('store', this);
            console.groupEnd();
        }
        return files;
    }

    /**
     * 格式化文件数据对象
     * @param fileData 文件数据构建对象
     * @returns 文件数据对象
     */
    normalizeItem = (fileDataLike: FileData|FileDataLike) => {
        const fileData = FileData.create(fileDataLike);
        const oldFile = this.getFile(fileData.gid);
        if (oldFile) {
            oldFile.change(fileData._data);
            return oldFile;
        }
        fileData.onChange = this._handleFileDataChange;
        return fileData;
    };

    /**
     * 查询指定类型的文件
     * @param options 查询选项
     * @param options.cgid 指定要加载的聊天，否则返回所有聊天中包含的文件
     * @param options.category 文件类别，包括 doc（文档），image（图片），program（程序）
     * @param options.limit 返回结果的最大数目限制
     * @param options.offset 查询时略过的结果数目
     * @param options.reverse 是否以倒序返回结果
     * @param options.includeFailureFile 是否包含发送失败的文件
     * @param options.contentType 消息 contentType，当前仅支持 image
     * @returns 通过 Promise 异步返回查询到的文件对象
     */
    async loadChatFiles(options: Partial<{
        cgid: string,
        category: false|string,
        limit: number,
        offset: number,
        reverse: boolean,
        includeFailureFile: boolean,
        contentType: 'image'
    }> = {}): Promise<FileData[]> {
        const {cgid, category = '', limit = 0, offset = 0, reverse = true, includeFailureFile = false, contentType = 'image'} = options;
        const categoryLowerCase = category ? category.toLowerCase() : false;
        const contentTypeSet = new Set(String(contentType).split(','));
        const effectiveLimit = limit > 0 ? limit : DEFAULT_CHAT_FILES_LIMIT;
        let messages = await queryMessagesFromDatabase({
            cgid,
            condition: x => Boolean(x.contentType && contentTypeSet.has(x.contentType) && !x.deleted),
            limit: effectiveLimit,
            offset,
            reverse
        });
        messages = messages.filter(x => !x.isEmotionContent);
        if (messages?.length) {
            const gidSet = new Set<string>();
            const files = messages.map(FileData.fromMessage).filter(file => {
                if (!file || gidSet.has(file.gid)) {
                    return false;
                }
                if (categoryLowerCase && file.category !== categoryLowerCase) {
                    return false;
                }
                if (!includeFailureFile && file.isInLocal) {
                    return false;
                }
                gidSet.add(file.gid);
                return true;
            });
            if (files?.length) {
                return this.store(files);
            }
        }
        return [];
    }

    /**
     * 查询会话图片
     * @param options 查询选项
     * @param options.cgid 指定要加载的聊天，否则返回所有聊天中包含的图片
     * @param options.limit 回结果的最大数目限制
     * @param options.offset 查询时略过的结果数目
     * @param options.reverse 是否以倒序返回结果
     * @param options.includeFailureFile 是否包含发送失败的文件
     * @returns 通过 Promise 异步返回查询到的图片对象
     */
    loadChatImages(options: Parameters<typeof this.loadChatFiles>[0]): Promise<FileData[]> {
        return this.loadChatFiles({...options, contentType: 'image'});
    }

    /**
     * 搜索文件
     * @param key 搜索关键字，包括 doc（文档），image（图片），program（程序）
     * @param category 文件类别
     * @param contentType 文件类型
     * @returns 通过 Promise 异步返回查询到的文件对象
     */
    searchFiles(key: string, category = '', contentType: 'image' = 'image'): Promise<FileData[]> {
        return this.loadChatFiles({category, contentType}).then(files => {
            if (!files?.length) {
                return Promise.resolve([]);
            }
            const keys = key ? key.trim().toLowerCase().split(' ') : null;
            if (keys?.length) {
                const result: Array<{score: number, file: FileData}> = [];
                for (const file of files) {
                    const score = file.getMatchScore(keys);
                    if (score) {
                        result.push({score, file});
                    }
                }
                result.sort((x, y) => y.score - x.score);
                return Promise.resolve(result.map(x => x.file));
            }
            return Promise.resolve(files);
        });
    }

    /**
     * 搜索图片
     * @param keys 搜索关键字
     * @returns 查询到的图片
     */
    searchImages(keys: string): Promise<FileData[]> {
        return this.searchFiles(keys, '', 'image');
    }

    /**
     * 处理消息存储事件，同步更新已缓存的文件信息
     * @param messages 存储的消息列表
     */
    _handleMessagesStore(messages: ChatMessage[]) {
        const filesNeedStore = [];
        for (const message of messages) {
            if (message.isInLocal) {
                continue;
            }
            if (message.deleted && message.isImageContent) {
                const img = message.imageContent;
                const file =
                    (img && this.getItemFromCache(img[this._key])) ??
                    this.getChatFiles(message.cgid, 'image').filter((x) => message.id === x.messageID)[0];
                if (file) {
                    delete file._data.id;
                    filesNeedStore.push(file);
                }
                continue;
            }
            const fileContent = message.imageContent;
            if (fileContent) {
                filesNeedStore.push(fileContent);
            }
        }

        if (filesNeedStore.length) {
            this.store(filesNeedStore);
        }
    }

    /**
     * 处理文件变更事件
     * @param file 变更的文件对象
     */
    _handleFileDataChange(file: FileData) {
        const {messageID} = file;
        if (messageID) {
            const message = chatMessagesStore.getMessage(messageID);
            if (message && message.cacheFilePath !== file.cachePath) {
                message.cacheFilePath = file.cachePath;
                chatMessagesStore.store(message);
                // 额外持久化到 common 表，防止重新登录后服务器消息覆盖导致丢失
                if (file.cachePath) {
                    putCommonDataItem('MessageCachePath', String(messageID), file.cachePath).catch(() => { /* common table may not be ready */ });
                    if (DEBUG) {
                        console.log('[CacheFilePath] persist to common:', {messageID, path: file.cachePath});
                    }
                }
            }
        }
        if (this.hasCacheItem(file.gid)) {
            this.store(file);
        }
    }
}

/**
 * 文件数据存储中心
 */
const filesStore = new FilesStore();

// 监听数据库初始化完成事件
setCallbackOnInitedDB(filesStore.reset.bind(filesStore));

if (DEBUG) {
    global.$filesStore = filesStore;
}

/**
 * 获取文件数据对象
 * @param fileGidOrObject 文件 GID 或者文件对象
 * @returns 文件数据对象
 */
export function getFileData(fileGidOrObject: string|FileData|FileDataLike) {
    if (!fileGidOrObject) {
        return null;
    }
    if (typeof fileGidOrObject === 'string') {
        return filesStore.getFile(fileGidOrObject);
    }
    if (typeof fileGidOrObject === 'object') {
        if (fileGidOrObject instanceof FileData && filesStore.hasCacheItem(fileGidOrObject.gid)) {
            return fileGidOrObject;
        }
        if (fileGidOrObject._data) {
            fileGidOrObject = fileGidOrObject._data;
        }
        return filesStore.store(fileGidOrObject)[0];
    }
    return null;
}

/**
 * @param gid 文件gid
 * @returns 数据库查询返回值
 */
export function getP2pFilePath(gid: string): Promise<string> {
    return getCommonDataItem('P2pFilePath', gid);
}

/**
 * @param gid 文件gid
 * @param filePath 文件路径
 * @returns 异步返回处理结果
 */
export function setP2pFilePath(gid: string, filePath: string) {
    putCommonDataItem('P2pFilePath', gid, filePath);
}

export default filesStore;
