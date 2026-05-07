import to from 'await-to-js';
import type {Collection, Table} from 'dexie';
import {Subject} from 'rxjs';
import platform from '~/app/platform';
import {isNotEmptyArray} from '~/app/utils/check-empty';
import DelayAction from '~/app/utils/delay-action';
import IdleTaskList from '~/app/utils/idle-task-list';
import {isLocalID} from '~/app/utils/local-id';
import {getStoreItem, setStoreItem} from '~/app/utils/store';
import dexie, {beginDBBusyTask, endDBBusyTask, setCallbackOnInitedDB} from '../db';
import {getCommonDataItem, putCommonDataItem} from '../db/common-data';
import {DataStore} from '../db/datastore';
import {getCurrentUser, getCurrentUserID, onUserLogout} from '../profile';
import socket from '../server/socket';
import {isOpenedActiveChat} from './chat-active-state';
import ChatMessage, {
    type ChatMessageLike,
    CONTENT_TYPES,
    createChatMessage,
    isLocalMessageID,
    TYPES,
} from './chat-message';
import {emitReceiveNewMessages, emitUnreadMessagesChange, tryEmitUnreadMessagesChange} from './chat-message-notice';
import {syncLastReadMessageForChat, toggleFreezeChat} from './chats-server-api';
import chatsStore from './chats-store';
import {onFinishFetchingHistory, onStartFetchingHistory} from './fetch-history-events';
import {NotificationMessage, createNotificationMessage} from './notification-message';

/**
 * 分页对象
 */
export type Pager = {
    /**
     * 每页记录数量
     */
    recPerPage: number;
    /**
     * 记录总数
     */
    recTotal: number;
    /**
     * 页码
     */
    pageID: number;
    /**
     * 总页数
     */
    pageTotal: number;
    /**
     * 偏移量
     */
    offset?: number;
    /**
     * 范围
     */
    range?: [number, number];
    /**
     * 上一页
     */
    prevPager?: Pager;
    /**
     * 下一页
     */
    nextPager?: Pager;
};

type KeyBy = 'id' | 'index';

type QueryMessagesOptions = Partial<{
    cgid: string;
    condition: (m: ChatMessageLike) => boolean;
    limit: number;
    offset: number;
    reverse: boolean;
}>;

/**
 * 根据查询条件从数据库获取消息集合
 * @param cgid 会话 gid
 * @param condition 查询条件
 * @param options 查询选项
 * @returns 消息集合
 */
function getMessageFromDexie(options: QueryMessagesOptions = {}) {
    const {cgid, condition, limit = 0, offset = 0, reverse = true} = options;
    if (!dexie.database) {
        return null;
    }

    let messages: Table<ChatMessageLike> | Collection<ChatMessageLike> | null = dexie.database.chatMessages;
    if (!messages) {
        return null;
    }

    if (cgid) {
        messages = messages.where('cgid').equals(cgid);
    }
    if (typeof condition === 'function') {
        messages = messages.filter(condition);
    }
    if (reverse) {
        messages = messages.reverse();
    }
    if (offset) {
        messages = messages.offset(offset);
    }
    if (limit) {
        messages = messages.limit(limit);
    }
    return messages;
}

/**
 * 从数据库查询消息
 * @param options 选项
 * @param options.cgid 所属会话的 GID，如果为 ''，则返回所有会话
 * @param options.condition 查询条件，可以为回调函数或者查询键值对象
 * @param options.limit 最多返回结果数目，如果为 0 则返回所有符合条件的结果
 * @param options.offset 指定跳过指定数目的结果
 * @param options.reverse 是否倒序（最新的结果在前面）返回结果
 * @returns 返回消息数目
 */
export async function queryMessagesCountFromDatabase(options: QueryMessagesOptions = {}) {
    const messageCollection = getMessageFromDexie(options);
    if (!messageCollection) {
        return 0;
    }

    const count = await messageCollection.count();
    return count;
}

/**
 * 从数据库查询消息
 * @param options 选项
 * @param options.cgid 所属会话的 GID，如果为 ''，则返回所有会话
 * @param options.condition 查询条件，可以为回调函数或者查询键值对象
 * @param options.limit 最多返回结果数目，如果为 0 则返回所有符合条件的结果
 * @param options.offset 指定跳过指定数目的结果
 * @param options.reverse 是否倒序（最新的结果在前面）返回结果
 * @returns 返回 ChatMessageLike[]
 */
export async function queryRawMessagesFromDatabase(options: QueryMessagesOptions = {}) {
    const messageCollection = getMessageFromDexie(options);
    if (!messageCollection) {
        return [];
    }

    const messageLikes = await messageCollection.toArray();
    return messageLikes;
}

/**
 * 从数据库查询消息
 * @param options 选项
 * @param option.cgid 所属会话的 GID，如果为 ''，则返回所有会话
 * @param option.condition 查询条件，可以为回调函数或者查询键值对象
 * @param options.limit 最多返回结果数目，如果为 0 则返回所有符合条件的结果
 * @param options.offset 指定跳过指定数目的结果
 * @param options.reverse 是否倒序（最新的结果在前面）返回结果
 * @returns 返回 ChatMessage[]
 */
export async function queryMessagesFromDatabase(options: QueryMessagesOptions = {}) {
    const messageLikes = await queryRawMessagesFromDatabase(options);
    return messageLikes.map((m) => createMessage(m));
}

/**
 * 创建一个聊天消息实例
 * @param message 聊天消息存储对象
 * @param store 聊天消息存储中心
 * @returns 聊天消息实例
 */
export const createMessage = (
    message: ChatMessage | NotificationMessage | ChatMessageLike,
    store?: ChatMessagesStore,
) => {
    if (message instanceof ChatMessage || message instanceof NotificationMessage) {
        return message;
    }

    if (store) {
        const oldMessage = store.getItemFromCache(message.id);
        if (oldMessage) {
            if (!isLocalID(message.id) && message.deleted && message.user === getCurrentUserID()) {
                message.contentBackup = oldMessage.content;
            }
            // 保留本地已下载文件的 cacheFilePath，避免被服务器数据覆盖
            if (oldMessage.cacheFilePath && !message.cacheFilePath) {
                const isFileOrImage = message.contentType === CONTENT_TYPES.image;
                if (isFileOrImage) {
                    message.cacheFilePath = oldMessage.cacheFilePath;
                }
            }
        }
    }

    return message.type === TYPES.notify ? createNotificationMessage(message) : createChatMessage(message);
};

/** common 表中 MessageCachePath 的 type */
const MESSAGE_CACHE_PATH_TYPE = 'MessageCachePath';

/** 是否输出 cacheFilePath 相关调试日志 */
const DEBUG_CACHE_FILE_PATH = DEBUG;

/**
 * 从 common 表合并本地已下载文件的 cacheFilePath 到从服务器获取的消息中
 * 用于解决重新登录后服务器消息覆盖本地下载状态的问题
 * 注：chatMessages 表可能已被服务器消息覆盖，因此仅依赖 common 表作为持久化来源
 * @param messageLikes 从服务器获取的消息列表（会被原地修改）
 */
async function mergeLocalCacheFilePathFromDb(messageLikes: ChatMessageLike[]): Promise<void> {
    if (!messageLikes?.length) {
        return;
    }
    const validEntries = messageLikes
        .map((m, i) => (m?.id && !isLocalID(m.id) ? ({id: m.id, index: i} as const) : null))
        .filter((x): x is {id: number; index: number} => x != null);
    if (!validEntries.length) {
        return;
    }

    for (const {id, index} of validEntries) {
        const msg = messageLikes[index];
        const isFileOrImage = msg?.contentType === CONTENT_TYPES.image;
        if (isFileOrImage && !msg.cacheFilePath) {
            try {
                const path = await getCommonDataItem(MESSAGE_CACHE_PATH_TYPE, String(id));
                if (path) {
                    msg.cacheFilePath = path;
                    if (DEBUG_CACHE_FILE_PATH) {
                        console.log('[CacheFilePath] merge from common:', {msgId: id, path});
                    }
                }
            } catch {
                // common 表可能未就绪，忽略
            }
        }
    }
}

/**
 * 从服务器获取指定会话消息信息
 * @param cgid 会话 GID
 * @returns 会话消息信息对象
 */
export async function fetchChatMessageInfoFromRemote(cgid: string) {
    const chat = chatsStore.getChat(cgid);
    if (chat && chat.isLocal) {
        return {lastMessage: 0, messageCount: 0};
    }

    const [error, messageInfo] = await to(
        socket.sendAndListen<{lastMessage: number; messageCount: number}>({
            method: 'chatGetMessageInfo',
            params: [cgid],
        }),
    );

    if (error && DEBUG) {
        console.collapse(
            'STORE.ChatMessage',
            'pinkBg',
            'fetch chat message info Error',
            'redPale',
            String(error),
            'red',
        );
        console.error('error', error);
        console.groupEnd();
    }

    if (messageInfo) {
        if (DEBUG_I) {
            console.collapse(
                'STORE.ChatMessage',
                'pinkBg',
                'fetch chat message info',
                'pinkPale',
                `last message ID ${messageInfo.lastMessage}, count ${messageInfo.messageCount}`,
                '',
            );
            console.log('messageInfo', messageInfo);
            console.groupEnd();
        }
        return messageInfo;
    }
    return null;
}

/**
 * 获取会话消息分页信息对象
 * @param cgid 会话 GID
 * @param recPerPage 每页消息记录数
 * @param reverse 是否为从后至前
 * @returns 分页信息对象
 */
async function getChatMessagesPager(cgid: string, recPerPage = 20, reverse = true): Promise<Pager> {
    let recTotal = 0;
    let pageTotal = 0;
    let rangeEnd = 0;

    const messageInfo = await fetchChatMessageInfoFromRemote(cgid);
    if (messageInfo) {
        recTotal = messageInfo.messageCount;
        rangeEnd = messageInfo.lastMessage;
        pageTotal = Math.ceil(recTotal / recPerPage);
    }

    return {
        recPerPage,
        pageID: reverse ? pageTotal : 1,
        recTotal,
        pageTotal,
        range: [0, rangeEnd],
    };
}

/**
 * 从服务器同步消息
 * @param cgid 会话 GID
 * @param fromID 起始消息 ID
 * @returns 使用 Promise 异步返回消息
 */
export async function syncMessagesFromRemote(cgid: string, fromID: number): Promise<ChatMessage[]>;

/**
 * 从服务器同步消息
 * @param cgid 会话 GID
 * @param fromID 起始消息 ID
 * @param options options 选项
 * @param options.reverse 是否将 [fromID] 作为结束 ID 倒序返回记录
 * @param options.limit 返回数目限制
 * @param options.returnID 仅返回消息 ID
 * @returns 使用 Promise 异步返回消息
 */
export async function syncMessagesFromRemote(
    cgid: string,
    fromID: number,
    options: {
        returnID: false;
        reverse?: boolean;
        limit?: number;
    },
): Promise<ChatMessage[]>;

/**
 * 从服务器同步消息
 * @param cgid 会话 GID
 * @param fromID 起始消息 ID
 * @param options options 选项
 * @param options.reverse 是否将 [fromID] 作为结束 ID 倒序返回记录
 * @param options.limit 返回数目限制
 * @param options.returnID 仅返回消息 ID
 * @returns 使用 Promise 异步返回消息 ID
 */
export async function syncMessagesFromRemote(
    cgid: string,
    fromID: number,
    options: {
        returnID: true;
        reverse?: boolean;
        limit?: number;
    },
): Promise<number[]>;

export async function syncMessagesFromRemote(
    cgid: string,
    fromID: number,
    options: Partial<{
        reverse: boolean;
        limit: number;
        returnID: boolean;
    }> = {},
): Promise<ChatMessage[] | number[]> {
    const {reverse = false, limit = 50, returnID = false} = options;
    const [error, messages] = await to(
        socket.sendAndListen({
            method: 'messageSync',
            params: [cgid, fromID, reverse, limit, returnID],
        }),
    );

    if (error) {
        if (DEBUG) {
            console.collapse('STORE.ChatMessage', 'pinkBg', 'sync messages Error', 'redPale', String(error), 'red');
            console.error('error', error);
            console.log('params:', {cgid, fromID, reverse, limit, returnID});
            console.groupEnd();
        }
        return [];
    }

    if (DEBUG) {
        console.collapse(
            'STORE.ChatMessage',
            'pinkBg',
            'sync messages',
            'pinkPale',
            messages ? messages.length : 0,
            '',
        );
        console.log('messages:', messages);
        console.log('params:', {cgid, fromID, reverse, limit, returnID});
        console.groupEnd();
    }
    return messages;
}

/**
 * 判断给定的消息 ID 是否在会话中置顶
 * @param messageID 消息 ID
 * @param cgid 会话 GID
 * @returns 如果返回 `true` 则为已置顶
 */
export function isMessagePinnedInChat(messageID: number, cgid: string) {
    const chat = chatsStore.getChat(cgid);
    if (!chat) {
        return false;
    }
    return chat.isPinnedMessage(messageID);
}

/**
 * 会话消息数据存储中心
 */
class ChatMessagesStore extends DataStore<number, ChatMessage, ChatMessageLike> {
    /**
     * <unionId, id>
     */
    unionIdMap = new Map<string, number>();

    /**
     * 空闲任务管理器，用于执行非紧急请求
     */
    _idleTasks = new IdleTaskList();

    /**
     * 会话消息保存到数据库事件
     */
    private messageSavedSubject = new Subject<Array<ReturnType<ChatMessage['plain']>>>();

    /**
     * 保存数据到数据库延时任务
     */
    _databaseSaveTask = new DelayAction(this.saveMessagesToDatabase.bind(this), 200);

    /**
     * 需要保存到数据库的消息集合
     */
    _messagesNeedSave = new Set<ChatMessage>();

    /**
     * 需要异步加载的消息 ID 集合
     */
    messagesNeedLoad = new Map<string, Set<number>>();

    /**
     * 需要异步加载的消息 Index 集合
     */
    messagesNeedLoadByIndex = new Map<string, Set<number>>();

    /**
     * 加载数据延时任务
     */
    _messagesLoadTask = new DelayAction(this.tryLoadMessages.bind(this), 200);

    /**
     * 会话消息数据是否就绪
     */
    _ready = false;

    /**
     * 是否正在进行消息同步
     */
    _synchronizing = false;

    /**
     * 通知消息最大 Index
     */
    maxNotificationIndex = 0;

    _afterStoreChatMessages: (chat: Chat, result: ReturnType<Chat['setLatestMessages']>) => void;

    /**
     * 创建一个会话消息数据存储中心实例
     */
    constructor() {
        super('ChatMessage', {channelDelayTime: 120});

        // 当会话数据就绪时处理消息数据
        chatsStore.subscribeChatsReadyEvent(this.handleChatsReady.bind(this));

        onStartFetchingHistory(() => {
            this._synchronizing = true;
        });

        onFinishFetchingHistory(() => {
            // 延时等待写库完成，立即完成会重新导致 use-chats-messages 的监听造成重复 store
            setTimeout(() => {
                this._synchronizing = false;
            }, 2 * 1000);
        });
    }

    /**
     * 获取会话消息数据是否就绪
     */
    get isReady() {
        return this._ready;
    }

    /**
     * 是否正在进行历史消息同步
     */
    get isSynchronizing() {
        return this._synchronizing;
    }

    /**
     * 同步结束后裁剪参与同步的会话的 latestMessageIndexes，避免主窗口持有超大列表
     * @param cgids 参与同步的会话 GID 列表
     * @param length 保留的最近消息条数，默认 100
     */
    shrinkSyncedChatsMessageLists(cgids: string[], length = 100) {
        if (!cgids?.length) {
            return;
        }
        const chatsToStore = [];
        for (const cgid of cgids) {
            const chat = chatsStore.getChat(cgid, false);
            if (chat && chat.latestMessageIndexes.length > length) {
                chat.shrinkMessageIndexList(length);
                chatsToStore.push(chat);
            }
        }
        if (chatsToStore.length) {
            chatsStore.store(chatsToStore);
        }
    }

    /**
     * 用于格式化会话消息对象的回调函数
     * @override
     */
    normalizeItem = createMessage;

    /**
     * 处理会话数据就绪
     */
    async handleChatsReady() {
        // 获取错失的消息
        await this.fetchMissedMessages();

        // 获取离线消息
        await this.fetchOfflineMessagesFromRemote();

        this._ready = true;
        this.maxNotificationIndex = 0;
    }

    /**
     * 重置数据存储中心
     * @param identify 数据存储标识，通常为当前连接的服务器地址
     */
    override reset(identify: string) {
        const identifyChanged = super.reset(identify);

        this._ready = false;

        if (identifyChanged) {
            this._databaseSaveTask.cancel();
        }
        this._idleTasks.cancelAll();

        if (DEBUG_I) {
            console.collapse('STORE.ChatMessage', 'pinkBg', 'reset', 'pinkPale', identifyChanged, '');
            console.log('identify', identify);
            console.groupEnd();
        }
        return identifyChanged;
    }

    /**
     * 存储会话消息数据
     * @param chatMessages 要存储的数据对象列表
     * @param options 存储选项
     * @param options.putToDatabase 是否将数据更新到数据库
     * @param options.skipChatFilter 是否跳过过滤数据
     * @returns 存储的数据对象列表
     */
    override store(
        chatMessageLikes: ChatMessage | ChatMessageLike | Array<ChatMessage | ChatMessageLike>,
        options: Partial<{
            putToDatabase: boolean;
            putToCache: boolean;
            skipChatFilter: boolean;
            unread: boolean;
        }> = {},
    ) {
        if (!chatMessageLikes) {
            return [];
        }
        if (!Array.isArray(chatMessageLikes)) {
            chatMessageLikes = [chatMessageLikes];
        }

        const {skipChatFilter = false} = options;
        if (!skipChatFilter) {
            chatMessageLikes = chatMessageLikes.filter((chatMessage) => {
                if (!chatMessage) {
                    return false;
                }
                const chat = chatsStore.getChat(chatMessage.cgid);
                return Boolean(chat);
            });
        }

        const currentUserID = getCurrentUserID();
        const localNotificationsStoreKey = `DATASTORE::${this._identify}::${this._name}::LOCAL_NOTIFICATION`;
        const localNotifications: number[] = getStoreItem(localNotificationsStoreKey, []);
        chatMessageLikes = chatMessageLikes.filter((chatMessage) => chatMessage);

        setStoreItem(localNotificationsStoreKey, localNotifications);

        if (!chatMessageLikes.length) {
            return [];
        }

        const {putToDatabase = true} = options;

        const chatMessages = super.store(chatMessageLikes, {normalizeFunc: (m) => createMessage(m, this)}); // 将消息存储到缓存

        if (putToDatabase) {
            this.planToSaveMessagesToDatabase(chatMessages);
        }

        if (DEBUG_I) {
            console.collapse('STORE.ChatMessage', 'pinkBg', 'store', 'pinkPale', chatMessages.length, '');
            console.trace('chatMessages', chatMessages);
            console.log('options', options);
            console.log('store', this);
            console.groupEnd();
        }

        // 历史同步期间仅写库/缓存，不更新会话的 latestMessageIndexes，避免主聊天窗口 list 暴增卡顿
        if (!this._synchronizing) {
            /**
             * 已经存储的会话消息列表
             */
            const chatsMap = chatMessages.reduce((map, message) => {
                const {cgid} = message;

                if (map.has(cgid)) {
                    map.get(cgid).push(message);
                } else {
                    map.set(cgid, [message]);
                }
                return map;
            }, new Map<string, ChatMessage[]>());

            if (DEBUG_I) {
                console.collapse('STORE.ChatMessage', 'pinkBg', 'set latest messages', 'pinkPale', chatsMap.size, '');
            }

            // 处理存储会话消息过程
            const chatsNeedUpdate = [];
            const newMessages = [];
            const newUnread = [];
            const deletedUnread = [];
            const lastReadChanged = [];
            const frozenCanceled = [];
            const isWindowOpenAndFocus = platform.call('ui.isWindowOpenAndFocus');
            const localDeletedMessages = [];
            for (const [cgid, messages] of chatsMap) {
                const chat = chatsStore.getChat(cgid, false);
                if (!chat) {
                    continue;
                }

                // 更新会话相关数据
                const result = chat.setLatestMessages(messages, {
                    currentUserID,
                    isFocusedActiveChat: isWindowOpenAndFocus && isOpenedActiveChat(chat.gid),
                });

                if (result.updated) {
                    chatsNeedUpdate.push(chat);
                }
                if (result.newMessages.length) {
                    newMessages.push(...result.newMessages);
                }
                if (result.newUnread.length) {
                    newUnread.push(...result.newUnread);
                }
                if (result.deletedUnread.length) {
                    deletedUnread.push(...result.deletedUnread);
                }
                if (result.lastReadChanged) {
                    lastReadChanged.push(cgid);
                }
                if (result.frozenCanceled) {
                    frozenCanceled.push(cgid);
                }
                if (result.localDeletedMessages.length) {
                    localDeletedMessages.push(...result.localDeletedMessages);
                }

                if (this._afterStoreChatMessages) {
                    this._afterStoreChatMessages(chat, result);
                }

                if (DEBUG_I) {
                    console.collapse(
                        chat.name || chat.gid,
                        result.updated ? 'green' : '',
                        `count:${chat.latestMessageIndexes.length}`,
                        '',
                        `unread:${chat.unreadMessagesCount}`,
                        chat.unreadMessagesCount ? 'orange' : '',
                        `newUnread:${result.newUnread.length}`,
                        result.newUnread.length ? 'orange' : '',
                        `lastRead:${chat.lastReadMessageIndex}`,
                        result.lastReadChanged ? 'orange' : '',
                        '',
                    );
                    console.log(result);
                    console.groupEnd();
                }
            }

            if (DEBUG_I) {
                console.trace('chatsMap', chatsMap);
                console.groupEnd();
            }

            if (chatsNeedUpdate.length) {
                chatsStore.store(chatsNeedUpdate);
            }
            if (newMessages.length) {
                emitReceiveNewMessages(newMessages);
            }
            if (newUnread.length || deletedUnread.length) {
                emitUnreadMessagesChange(chatsStore.getUnreadMessageCount());
            } else {
                tryEmitUnreadMessagesChange(chatsStore.getUnreadMessageCount());
            }
            if (lastReadChanged.length) {
                // TODO: 向服务器更新最后阅读消息位置
                for (const cgid of lastReadChanged) {
                    syncLastReadMessageForChat(chatsStore.getChat(cgid, false));
                }
            }
            if (frozenCanceled.length) {
                for (const cgid of frozenCanceled) {
                    toggleFreezeChat(chatsStore.getChat(cgid), false);
                }
            }
            if (localDeletedMessages.length) {
                for (const id of localDeletedMessages) {
                    this.deleteCacheItem(id);
                }
            }
        }

        for (const msg of chatMessages) {
            if (msg.id && msg.unionId) {
                this.unionIdMap.set(msg.unionId, msg.id);
            }
        }

        return chatMessages;
    }

    /**
     * 设置存储完成时的回调函数
     * @param callback 回调函数
     */
    afterStoreChatMessages(callback: typeof this._afterStoreChatMessages) {
        if (this._afterStoreChatMessages && DEBUG) {
            console.error("this._afterStoreChatMessages is not empty, it's may be an error.");
        }
        this._afterStoreChatMessages = callback;
    }

    /**
     * 从数据库获取指定 ID 的多个消息信息
     * @param cgid 会话 GID
     * @param ids 会话消息 ID 或者 Index 列表
     * @param putToCache 是否保存到内存缓存中
     * @param keyBy 查找所使用的键
     * @returns 使用 Promise 异步返回处理结果
     */
    async getMessagesFromDatabase(
        cgid: string,
        ids: number[],
        putToCache = true,
        keyBy = 'id',
    ): Promise<ChatMessage[]> {
        const identify = this._identify;
        const chatMessagesInDb =
            keyBy === 'id'
                ? await dexie.database.chatMessages.bulkGet(ids)
                : await dexie.database.chatMessages
                      .where('unionId')
                      .anyOf(ids.map((index) => `${cgid}@${index}`))
                      .toArray();
        if (identify !== this._identify) {
            return;
        }
        const updatedChatMessages: ChatMessage[] = [];
        const chatMessages: ChatMessage[] = [];
        for (const chatMessageLike of chatMessagesInDb) {
            if (!chatMessageLike) {
                continue;
            }

            const cacheChatMessage = this._cache.get(chatMessageLike.id);
            if (cacheChatMessage) {
                chatMessages.push(cacheChatMessage);
                continue;
            }

            let chatMessageLikeToUse = chatMessageLike;
            // 从 common 表恢复 cacheFilePath（解决重新登录后丢失的问题）
            const isFileOrImage = chatMessageLike.contentType === CONTENT_TYPES.image;
            if (isFileOrImage && !chatMessageLike.cacheFilePath && chatMessageLike.id) {
                try {
                    const path = await getCommonDataItem(MESSAGE_CACHE_PATH_TYPE, String(chatMessageLike.id));
                    if (path) {
                        chatMessageLikeToUse = {...chatMessageLike, cacheFilePath: path};
                        if (DEBUG_CACHE_FILE_PATH) {
                            console.log('[CacheFilePath] restore from common on DB load:', {
                                msgId: chatMessageLike.id,
                                path,
                            });
                        }
                    }
                } catch {
                    // common 表可能未就绪，忽略
                }
            }

            const chatMessage = createMessage(chatMessageLikeToUse, this);
            chatMessage.expired = true;
            updatedChatMessages.push(chatMessage);
            chatMessages.push(chatMessage);
        }

        if (updatedChatMessages.length) {
            this.store(updatedChatMessages, {putToDatabase: false, putToCache, unread: false});
        }
        return chatMessages;
    }

    /**
     * 稍后将指定会话保存到数据库
     * @param messages 要保存的会话消息列表
     */
    planToSaveMessagesToDatabase(messages: ChatMessage[]) {
        if (!isNotEmptyArray(messages)) {
            return;
        }

        for (const message of messages) {
            const {id} = message;
            if (isLocalMessageID(id)) {
                continue;
            }
            this._messagesNeedSave.add(message);
            // 将 cacheFilePath 额外持久化到 common 表，防止重新登录后服务器消息覆盖导致丢失
            const isFileOrImage = message.contentType === CONTENT_TYPES.image;
            if (isFileOrImage && message.cacheFilePath) {
                putCommonDataItem(MESSAGE_CACHE_PATH_TYPE, String(id), message.cacheFilePath).catch(() => {
                    /* common table may not be ready */
                });
            }
        }
        this._databaseSaveTask.do();
    }

    /**
     * 将更改的会话消息保存到数据库
     */
    async saveMessagesToDatabase() {
        if (!this._messagesNeedSave.size) {
            return;
        }
        const messagesNeedSave: Array<ReturnType<ChatMessage['plain']>> = [];
        for (const chatMessage of this._messagesNeedSave) {
            if (chatMessage) {
                messagesNeedSave.push(chatMessage.plain());
            }
        }

        this._messagesNeedSave.clear();

        if (messagesNeedSave.length) {
            beginDBBusyTask();
            try {
                const messageTable = dexie.database.chatMessages;

                if (messagesNeedSave.length) {
                    await messageTable.bulkPut(messagesNeedSave);
                }

                this.messageSavedSubject.next(messagesNeedSave);

                if (DEBUG_I) {
                    console.collapse(
                        'STORE.ChatMessage',
                        'pinkBg',
                        'save chat message to database',
                        'pinkPale',
                        messagesNeedSave.length,
                        '',
                    );
                    console.log('messagesNeedSave', messagesNeedSave);
                    console.log('store', this);
                    console.groupEnd();
                }
            } catch (error) {
                if (DEBUG) {
                    console.collapse(
                        'STORE.ChatMessage',
                        'pinkBg',
                        'save chat message to database Error',
                        'redPale',
                        String(error),
                        'red',
                    );
                    console.error('error', error);
                    console.log('messagesNeedSave', messagesNeedSave);
                    console.log('store', this);
                    console.groupEnd();
                }
            }
            endDBBusyTask();
        }
    }

    /**
     * 订阅会话消息保存到数据库事件
     * @param listener 监听函数
     * @returns 订阅 ID
     */
    subscribeMessagesSaved(listener: (plainMessages: Array<ReturnType<ChatMessage['plain']>>) => void) {
        return this.messageSavedSubject.subscribe(listener);
    }

    /**
     * 从缓存中根据 unionId 获取消息
     * @param unionId unionId
     * @returns 消息
     */
    getItemFromCacheByUnionId = (unionId: string) => {
        const messageID = this.unionIdMap.get(unionId);
        if (messageID) {
            return this.getItemFromCache(messageID);
        }
        return null;
    };

    /**
     * 从缓存中获取会话消息
     * @param  id 会话消息 ID 或 Index 列表
     * @param cgid 会话 GID，keyBy 为 index 时为必选参数
     * @param keyBy 查找所使用的键
     * @returns 会话消息对象
     */
    getMessage(id: number, cgid?: string, keyBy: KeyBy = 'id'): ChatMessage {
        const message = keyBy === 'id' ? this.getItemFromCache(id) : this.getItemFromCacheByUnionId(`${cgid}@${id}`);
        if (message) {
            message.lastAccessTime = Date.now();
            return message;
        }

        if (!this._synchronizing) {
            this.getMessagesFromDatabase(cgid, [id], true, keyBy);
        }
        return message;
    }

    /**
     * 从缓存中获取会话消息列表
     * @param ids 会话消息 ID 列表
     * @returns 会话消息列表
     */
    getMessages(ids: number[]): ChatMessage[];

    /**
     * 从缓存中获取会话消息列表
     * @param ids 会话消息 index 列表
     * @param cgid 会话 GID
     * @param keyBy 查找所使用的键
     * @returns 会话消息列表
     */
    getMessages(ids: number[], cgid: string, keyBy: 'index'): ChatMessage[];

    getMessages(ids: number[], cgid?: string, keyBy: KeyBy = 'id'): ChatMessage[] {
        if (!ids || !ids.length) {
            return [];
        }

        const messagesNeedLoad: number[] = [];
        let chatMessages: ChatMessage[];

        if (keyBy === 'id') {
            chatMessages = ids.map((id) => {
                const chatMessage = id ? this.getItemFromCache(id) : null;
                // 如果正在进行同步，则暂停计划加载指定会话的消息
                if (id && !chatMessage && !this._synchronizing) {
                    messagesNeedLoad.push(id);
                }
                return chatMessage;
            });
        } else {
            chatMessages = ids.map((index) => {
                const chatMessage = index ? this.getItemFromCacheByUnionId(`${cgid}@${index}`) : null;
                // 如果正在进行同步，则暂停计划加载指定会话的消息
                if (index && !chatMessage && !this._synchronizing) {
                    messagesNeedLoad.push(index);
                }
                return chatMessage;
            });
        }

        if (messagesNeedLoad.length) {
            this.planToLoadMessages(cgid, messagesNeedLoad, keyBy);
        }
        return chatMessages;
    }

    /**
     * 异步获取会话消息，依次尝试从内存、数据库和服务器获取消息数据
     * @param cgid 会话消息所属会话 GID
     * @param id 会话消息 ID 或 Index列表
     * @param putToCache 是否保存到内存缓存中
     * @param keyBy 查找所使用的键
     * @returns 异步返回会话消息
     */
    async asyncGetMessage(cgid: string, id: number, putToCache = true, keyBy: KeyBy = 'id') {
        if (!id) {
            return null;
        }

        let chatMessage = keyBy === 'id' ? this.getItemFromCache(id) : this.getItemFromCacheByUnionId(`${cgid}@${id}`);
        if (!chatMessage) {
            const resultInDb = await this.getMessagesFromDatabase(cgid, [id], putToCache, keyBy);
            chatMessage = resultInDb?.[0];
        }
        if (!chatMessage) {
            const resultFromRemote = await this.getMessagesFromRemote(cgid, [id], {putToCache, keyBy});
            chatMessage = resultFromRemote?.[0];
        }
        return chatMessage;
    }

    /**
     * 异步获取会话消息列表，依次尝试从内存、数据库和服务器获取消息数据
     * @param cgid 会话消息所属会话 GID
     * @param ids 会话消息 ID 或 Index 列表
     * @param putToCache 是否保存到内存缓存中
     * @param keyBy 查找所使用的键
     * @param fromMerged 来在合并消息的检查
     * @returns 异步返回会话消息
     */
    async asyncGetMessages(
        cgid: string,
        ids: number[],
        putToCache = true,
        keyBy: KeyBy = 'id',
        fromMerged = 0,
    ): Promise<ChatMessage[]> {
        const messagesNeedLookup = new Set<number>();
        const messages: ChatMessage[] = [];
        const idIndexes = new Map<number, number>();
        const getItem =
            keyBy === 'id'
                ? this.getItemFromCache
                : (index: number) => this.getItemFromCacheByUnionId(`${cgid}@${index}`);

        for (let i = 0; i < ids.length; ++i) {
            const id = ids[i];
            idIndexes.set(id, i);
            const message = getItem(id);
            if (message) {
                messages[i] = message;
            } else {
                messagesNeedLookup.add(id);
            }
        }

        // 从数据库加载数据
        if (messagesNeedLookup.size) {
            const messagesInDb = await this.getMessagesFromDatabase(cgid, [...messagesNeedLookup], putToCache, keyBy);
            if (messagesInDb?.length) {
                for (const message of messagesInDb) {
                    if (message) {
                        const id = keyBy === 'id' ? message.id : message.index;
                        const index = idIndexes.get(id);
                        messages[index] = message;
                        messagesNeedLookup.delete(id);
                    }
                }
            }
            // 将无法获取到的本地消息过滤掉，以免被请求到服务器
            for (const id of messagesNeedLookup) {
                if (isLocalID(id)) {
                    messagesNeedLookup.delete(id);
                }
            }
        }

        // 从服务器加载数据
        if (cgid && messagesNeedLookup.size) {
            const messagesFromRemote = await this.getMessagesFromRemote(cgid, [...messagesNeedLookup], {
                putToCache,
                keyBy,
                fromMerged,
            });
            if (messagesFromRemote?.length) {
                for (const message of messagesFromRemote) {
                    if (message) {
                        const id = keyBy === 'id' ? message.id : message.index;
                        const index = idIndexes.get(id);
                        messages[index] = message;
                        messagesNeedLookup.delete(id);
                    }
                }
            }
        }

        if (DEBUG) {
            if (messagesNeedLookup.size) {
                console.collapse(
                    'STORE.ChatMessage',
                    'pinkBg',
                    `Cannot load ${messagesNeedLookup.size} messages for chat`,
                    'redPale',
                    chatsStore.getChat(cgid)?.name || cgid,
                    'red',
                );
                console.error('messagesNeedLookup', messagesNeedLookup);
            } else {
                console.collapse(
                    'STORE.ChatMessage',
                    'pinkBg',
                    `Load ${messages.length} messages for chat`,
                    'pinkPale',
                    cgid,
                    '',
                );
            }
            console.log('messages', messages);
            console.log('cgid', cgid);
            console.log('ids', ids);
            console.groupEnd();
        }

        return messages;
    }

    /**
     * 计划加载指定会话的消息
     * @param cgid 会话 GID
     * @param ids 消息 ID 列表
     * @param keyBy 搜索的主键
     */
    planToLoadMessages(cgid: string, ids: number[], keyBy: 'id' | 'index' = 'id') {
        const needLoad = keyBy === 'id' ? this.messagesNeedLoad : this.messagesNeedLoadByIndex;
        if (needLoad.has(cgid)) {
            for (const id of ids) {
                needLoad.get(cgid).add(id);
            }
        } else {
            needLoad.set(cgid, new Set([...ids]));
        }
        this._messagesLoadTask.do();
    }

    /**
     * 尝试加载会话消息
     */
    async tryLoadMessages() {
        if (this.messagesNeedLoad.size) {
            const chatIdList = [...this.messagesNeedLoad.entries()];
            this.messagesNeedLoad.clear();

            for (const [cgid, ids] of chatIdList) {
                await this.asyncGetMessages(cgid, [...ids]);
            }
        }

        if (this.messagesNeedLoadByIndex.size) {
            const chatIndexList = [...this.messagesNeedLoadByIndex.entries()];
            this.messagesNeedLoadByIndex.clear();

            for (const [cgid, indexes] of chatIndexList) {
                await this.asyncGetMessages(cgid, [...indexes], true, 'index');
            }
        }
    }

    /**
     * 从服务器获取离线消息
     */
    async fetchOfflineMessagesFromRemote() {
        try {
            const result = await this._idleTasks.requestAndWait(
                async () => {
                    const offlineMessages = await socket.sendAndListen({
                        method: 'messageSyncSinceOffline',
                        params: [false],
                    });
                    if (offlineMessages?.length) {
                        await mergeLocalCacheFilePathFromDb(offlineMessages);
                        return this.store(offlineMessages, {putToDatabase: true, putToCache: true, unread: true});
                    }
                },
                {timeout: 3000, name: 'fetchOfflineMessagesFromRemote'},
            );
            if (DEBUG_I) {
                console.collapse(
                    'STORE.ChatMessage',
                    'pinkBg',
                    'fetch offline messages',
                    'pinkPale',
                    result ? result.length : 0,
                    '',
                );
                console.log('offlineMessages', result);
                console.groupEnd();
            }
        } catch (error) {
            if (DEBUG) {
                console.collapse(
                    'STORE.ChatMessage',
                    'pinkBg',
                    'fetch offline messages Error',
                    'redPale',
                    String(error),
                    'red',
                );
                console.error('error', error);
                console.log('store', this);
                console.groupEnd();
            }
        }
    }

    /**
     * 从服务器获取本地错失的消息
     */
    async fetchMissedMessages() {
        try {
            const result = await this._idleTasks.requestAndWait(
                async () => {
                    const lastKnownMessage = await dexie.database.chatMessages.orderBy('id').last();
                    if (!lastKnownMessage) {
                        return;
                    }
                    const missedMessages = await socket.sendAndListen({
                        method: 'messageSyncMissed',
                        params: [lastKnownMessage?.id],
                    });
                    if (missedMessages?.length) {
                        await mergeLocalCacheFilePathFromDb(missedMessages);
                        return this.store(missedMessages, {putToDatabase: true, putToCache: true, unread: false});
                    }
                },
                {timeout: 3000, name: 'fetchMissedMessage'},
            );
            if (DEBUG_I) {
                console.collapse(
                    'STORE.ChatMessage',
                    'pinkBg',
                    'fetch missed messages',
                    'pinkPale',
                    result ? result.length : 0,
                    '',
                );
                console.log('missedMessages', result);
                console.groupEnd();
            }
        } catch (error) {
            if (DEBUG) {
                console.collapse(
                    'STORE.ChatMessage',
                    'pinkBg',
                    'fetch missed messages Error',
                    'redPale',
                    String(error),
                    'red',
                );
                console.error('error', error);
                console.log('store', this);
                console.groupEnd();
            }
        }
    }

    /**
     * 从服务器获取指定会话的最后一条消息
     * @param cgids 会话 GID 列表
     * @returns 使用 Promise 异步返回处理结果
     */
    fetchLastMessageOfChatsFromRemote(cgids: string[]): Promise<ChatMessage[]> {
        return this._idleTasks.requestAndWait(
            async () => {
                let [error, lastMessages] = await to(
                    socket.sendAndListen({
                        method: 'chatGetLastMessage',
                        params: [cgids],
                    }),
                );

                if (error) {
                    if (DEBUG) {
                        console.collapse(
                            'STORE.ChatMessage',
                            'pinkBg',
                            'fetch latest messages of recents Error',
                            'redPale',
                            String(error),
                            'red',
                        );
                        console.error('error', error);
                        console.log('cgids', cgids);
                        console.groupEnd();
                    }
                    return;
                }

                if (DEBUG_I) {
                    console.collapse(
                        'STORE.ChatMessage',
                        'pinkBg',
                        'fetch latest messages of recents',
                        'pinkPale',
                        lastMessages ? lastMessages.length : 0,
                        '',
                    );
                    console.log('cgids', cgids);
                    console.log('lastMessages', lastMessages);
                    console.groupEnd();
                }

                if (lastMessages?.length) {
                    await mergeLocalCacheFilePathFromDb(lastMessages);
                    lastMessages = this.store(lastMessages, {putToDatabase: true, putToCache: true});
                }
                return lastMessages;
            },
            {name: 'fetchLastMessageOfChatsFromRemote', timeout: 3000},
        );
    }

    /**
     * 尝试从服务器获取会话的最后一条消息
     */
    async fetchLastMessageForChats() {
        const messagesNeedLookupDatabase: number[] = [];
        const chatsNeedFetchFromRemote: string[] = [];
        for (const chat of chatsStore.getAllChats()) {
            const {lastMessageInfo, lastMessage, gid} = chat;

            // 检查已有的最后一条消息信息是否为最新消息
            if (
                chat.isDeleted ||
                chat.isDismissed ||
                (chat.isOne2One && chat.isLocal) ||
                !lastMessage ||
                lastMessageInfo?.id === lastMessage
            ) {
                continue;
            }

            if (chat.historyEnd === lastMessage || chat.latestMessages.includes(lastMessage)) {
                messagesNeedLookupDatabase.push(lastMessage);
            } else {
                chatsNeedFetchFromRemote.push(gid);
            }
        }

        const promises: Promise<ChatMessage[]>[] = [];

        if (messagesNeedLookupDatabase.length) {
            promises.push(this.getMessagesFromDatabase(null, messagesNeedLookupDatabase));
        }

        if (chatsNeedFetchFromRemote.length) {
            promises.push(this.fetchLastMessageOfChatsFromRemote(chatsNeedFetchFromRemote));
        }

        if (promises.length) {
            await Promise.all(promises);
        }
    }

    /**
     * 从服务器中获取会话消息列表
     * @param cgid 会话 GID
     * @param ids 会话消息 ID 列表
     * @param options 获取选项
     * @param options.putToCache 是否保存到内存缓存中
     * @param options.skipChatFilter 存储时是否跳过消息过滤
     * @param options.putToCache 是否保存到内存缓存中
     * @param options.keyBy 查找所使用的键
     * @param options.fromMerged 来自合并消息的检查
     * @returns 会话消息列表
     */
    async getMessagesFromRemote(
        cgid: string,
        ids: number[],
        options: Partial<{
            putToCache: boolean;
            skipChatFilter: boolean;
            keyBy: KeyBy;
            fromMerged: number;
        }>,
    ): Promise<ChatMessage[]> {
        const user = getCurrentUser();
        if (!user) {
            return [];
        }

        const {putToCache = true, skipChatFilter = false, keyBy = 'id', fromMerged = 0} = options;
        const getParams = () => {
            if (keyBy === 'id') {
                return [cgid, ids, fromMerged];
            }
            return [cgid, ids];
        };
        const [error, messages] = await to(
            socket.sendAndListen({
                method: keyBy === 'id' ? 'messageGetList' : 'messageGetListByIndexes',
                params: getParams(),
            }),
        );

        if (error) {
            if (DEBUG) {
                console.collapse(
                    'STORE.ChatMessage',
                    'pinkBg',
                    'fetch messages Error',
                    'redPale',
                    String(error),
                    'red',
                );
                console.error('error', error);
                console.groupEnd();
            }
            return [];
        }

        if (DEBUG) {
            console.collapse(
                'STORE.ChatMessage',
                'pinkBg',
                'fetch messages',
                'pinkPale',
                messages ? messages.length : 0,
                '',
            );
            console.log('messages:', messages);
            console.groupEnd();
        }
        // 如果这个聊天不存在，那么就直接将消息转换为message(为了应对被合并的群)
        // 存储消息时会检查消息所属会话是否存在，这里为了防止因会话获取不到导致消息无法存储
        if (!chatsStore.getChat(cgid)) {
            return messages.map((message: ChatMessageLike) => createChatMessage(message));
        }
        // 合并本地已下载文件的 cacheFilePath，避免重新登录后覆盖下载状态
        await mergeLocalCacheFilePathFromDb(messages);
        return this.store(messages, {putToDatabase: true, putToCache, skipChatFilter});
    }

    /**
     * 获取会话指定分页的消息列表，支持以倒序的方式（第一页获取对是最后产生的消息）对会话消息记录进行漫游
     * @param cgid 会话 GID
     * @param options 获取选项
     * @param options.pager 分页信息对象，如果不指定则从第一页开始获取，如果是第一页可以通过此参数指定每页的记录数目
     * @param options.reverse 是否为倒序漫游
     * @param options.putToCache 是否保存到内存缓存中
     * @param options.skipChatFilter 存储时是否跳过消息过滤
     * @returns 通过异步返回消息列表和分页信息对象，pager 属性为当前分页信息对象，nextPager 为下一页分页信息对象，获取结果后可以通过此方法传入 nextPager 参数继续获取下一页的消息列表
     */
    async fetchChatMessagesByPage(
        cgid: string,
        options: Partial<{
            pager: Pager | number;
            reverse: boolean;
            putToCache: boolean;
            skipChatFilter: boolean;
        }>,
    ): Promise<{
        list: ChatMessage[];
        pager: Pager;
        nextPager: Pager;
        prevPager: Pager;
        ids?: number[];
        range?: [number, number];
    }> {
        const {reverse = true, putToCache = true, skipChatFilter = false, pager: pagerLike} = options;
        // 获取分页信息对象
        const pager =
            !pagerLike || typeof pagerLike === 'number'
                ? await getChatMessagesPager(cgid, typeof pagerLike === 'number' ? pagerLike : undefined, reverse)
                : pagerLike;

        // 规范化页码
        pager.recPerPage = Math.max(1, pager.recPerPage);
        pager.pageTotal ||= Math.ceil(pager.recTotal / pager.recPerPage);
        pager.pageID = Math.max(1, Math.min(pager.pageTotal || 1, pager.pageID));

        // 如果没有记录，直接返回
        if (!pager.recTotal) {
            return {
                list: [],
                pager,
                nextPager: null,
                prevPager: null,
            };
        }

        // 获取该分页内的消息 ID 列表
        const fromID = pager.range[reverse ? 1 : 0];
        const ids = await syncMessagesFromRemote(cgid, fromID, {reverse, limit: pager.recPerPage, returnID: true});

        /**
         * 消息 ID 与在返回列表中的索引表
         * Map<消息 ID, 数组索引>
         */
        const idsMap = new Map<number, number>(ids.map((id, i) => [id, i]));

        // 记录最终的消息列表
        const messages: ChatMessage[] = [];

        // 记录需要查找数据库的 ID 列表
        const needLookupDatabase = new Set<number>();

        // 从缓存中获取消息
        ids.forEach((id, i) => {
            const message = this.getItemFromCache(id);
            if (message) {
                messages[i] = message;
                return;
            }

            needLookupDatabase.add(id);
        });

        // 记录需要从服务器获取消息的 ID 集合
        let needFetchFromRemote: number[];

        // 从数据库中获取剩余的消息
        if (needLookupDatabase.size) {
            const messagesInDb = await this.getMessagesFromDatabase(cgid, [...needLookupDatabase], putToCache);
            for (const message of messagesInDb) {
                needLookupDatabase.delete(message.id);
                messages[idsMap.get(message.id)] = message;
            }
            if (needLookupDatabase.size) {
                needFetchFromRemote = [...needLookupDatabase];
            }
        }

        // 从远程服务器获取
        if (needFetchFromRemote?.length) {
            const messagesFromRemote = await this.getMessagesFromRemote(cgid, needFetchFromRemote, {
                putToCache,
                skipChatFilter,
            });
            if (messagesFromRemote?.length) {
                for (const message of messagesFromRemote) {
                    messages[idsMap.get(message.id)] = message;
                }
            }
        }

        const range: [number, number] = reverse ? [ids[ids.length - 1], ids[0]] : [ids[0], ids[ids.length - 1]];
        return {
            ids,
            list: messages,
            range,
            prevPager:
                pager.pageID > 1
                    ? {
                          ...pager,
                          pageID: pager.pageID - 1,
                          range: [0, range[0] - 1],
                      }
                    : null,
            pager: {
                ...pager,
                range,
            },
            nextPager:
                pager.pageID < pager.pageTotal
                    ? {
                          ...pager,
                          pageID: pager.pageID + 1,
                          range: [range[1] + 1, Number.MAX_SAFE_INTEGER],
                      }
                    : null,
        };
    }

    /**
     * 删除本地消息
     * @param id 消息 ID
     * @returns 如果为 true 则删除成功，否则删除失败（消息不存在）
     */
    deleteLocalMessage(id: number) {
        const message = this.getItemFromCache(id);
        if (!message) {
            return false;
        }

        if (message.markLocalDeleted()) {
            this.store(message);
            return true;
        }
        return false;
    }

    /**
     * 使用消息 index 订阅消息变更
     * @param indices 消息 index 或消息 index 数组
     * @param cgid 会话 GID
     * @param listener 变更回调
     * @returns 订阅 ID
     */
    subscribeByIndices(indices: number[], cgid: string, listener: (args: any[]) => void) {
        // TODO: 性能优化
        return this.subscribeAny((items) => {
            if (Array.isArray(items)) {
                const validItems = items.filter((x) => x.cgid === cgid && indices.includes(x.index));
                listener(validItems.map((x) => x?.proxy));
            } else if (items.cgid === cgid && indices.includes(items.index)) {
                listener(items.proxy);
            }
        });
    }

    /**
     * 清空指定会话的所有缓存消息
     * @param cgids 会话 GID 列表
     */
    clearCacheForChats(cgids: string[]) {
        if (!cgids || cgids.length === 0) {
            return;
        }

        let clearedCount = 0;
        for (const [id, message] of this._cache.entries()) {
            if (cgids.includes(message.cgid)) {
                this._cache.delete(id);
                // 同时清除unionIdMap中的映射
                if (message.unionId) {
                    this.unionIdMap.delete(message.unionId);
                }
                clearedCount++;
            }
        }

        if (DEBUG_I) {
            console.collapse('STORE.ChatMessage', 'pinkBg', 'clear cache for chats', 'pinkPale', clearedCount, '');
            console.log('cgids', cgids);
            console.log('clearedCount', clearedCount);
            console.groupEnd();
        }
    }
}

/**
 * 会话消息数据存储中心
 */
const chatMessagesStore = new ChatMessagesStore();

// 监听数据库初始化完成事件
setCallbackOnInitedDB(chatMessagesStore.reset.bind(chatMessagesStore));

// 当用户退出时保存未保存的数据
onUserLogout(() => {
    chatMessagesStore.saveMessagesToDatabase();
});

if (DEBUG) {
    global.$chatMessagesStore = chatMessagesStore;
}

export default chatMessagesStore;
