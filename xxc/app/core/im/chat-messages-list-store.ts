import IdleTaskList from '../../utils/idle-task-list';
import {setCallbackOnInitedDB} from '../db';
import {DataStore} from '../db/datastore';
import chatsStore from './chats-store';
import chatMessagesStore from './chat-messages-store';
import {generateContinuousList} from '../../utils/list-helper';
import {isOpenedActiveChat} from './chat-active-state';

/** 主聊天窗口使用的消息列表最大长度，避免单次渲染与订阅量过大 */
const MAX_MAIN_CHAT_LIST_LENGTH = 500;

/**
 * 会话消息列表记录对象
 */
type MessageListRecord = {
    cgid: string;
    list: number[];
    canLoadMore: boolean;
    loading: boolean;
    expired?: boolean;
};

/**
 * 获取指定会话消息 Index 列表记录对象
 * @param cgid 会话 GID
 * @param loading 默认的 loading 状态
 * @returns 会话消息列表记录对象
 */
function getChatMessageListRecord(cgid: string, loading = false) {
    const chat = chatsStore.getChat(cgid);
    if (!chat || chat.isLocal) {
        return {
            cgid,
            list: [],
            canLoadMore: false,
            loading: false
        };
    }

    const canLoadMore = !chat.latestMessageIndexes.includes(1) && chat.lastMessageIndex !== 0;
    const rawList = chat.latestMessageIndexes;
    const list = rawList.length > MAX_MAIN_CHAT_LIST_LENGTH
        ? rawList.slice(-MAX_MAIN_CHAT_LIST_LENGTH)
        : [...rawList];
    return {
        cgid,
        list,
        canLoadMore,
        loading: canLoadMore && loading
    };
}

/**
 * 判定两个会话消息列表记录对象内容是否一样
 * @param record1 会话消息列表记录对象1
 * @param record2 会话消息列表记录对象2
 * @returns 如果返回 true，表示两个记录内容一样
 */
function isSameMessageListRecord(record1: MessageListRecord, record2: MessageListRecord): boolean {
    return (
        record1 === record2 || (
            record1 && record2
            && record1.cgid === record2.cgid
            && record1.list === record2.list
            && record1.canLoadMore === record2.canLoadMore
            && record1.loading === record2.loading
        )
    );
}

/**
 * 判定两个会话消息列表记录对象中，消息列表是否为完全包含的关系
 * @param record1 会话消息列表记录对象1
 * @param record2 会话消息列表记录对象2
 * @returns 如果返回 true，表示 record1 完全包含 record2 的消息列表
 */
function isMessageListContained(record1: MessageListRecord, record2: MessageListRecord): boolean {
    return (
        record1 && record2
        && record2.list.every(x => record1.list.includes(x))
    );
}

let isLoading = false;

/**
 * 按 Index 加载消息
 * @param cgid 会话 GID
 * @param fromIndex 起始的 Index
 * @param length 长度，默认为 20
 * @param reverse 逆序查询, 如 [a, a-1, a-2, a-3]， 默认为 true
 * @returns 消息
 */
export async function loadMessages(cgid: string, fromIndex: number, {length = 20, reverse = true} = {}) {
    const loadingCheck = new Promise(resolve => {
        const startingDate = Date.now();
        const check = () => {
            if (Date.now() - 10000 > startingDate) {
                resolve(false);
            }
            if (isLoading) {
                setTimeout(check, 500);
                return;
            }
            resolve(true);
        };
        check();
    });
    const canLoad = await loadingCheck;
    if (!canLoad) {
        return;
    }

    if (fromIndex <= 0) {
        console.error('fromIndex <= 0, fromIndex: ', fromIndex);
        return;
    }

    const messageIndexes = reverse
        ? generateContinuousList(fromIndex, Math.max(1, fromIndex - (length - 1)), false)
        : generateContinuousList(fromIndex, Math.max(1, fromIndex + length - 1), true);
    const indexes = [...messageIndexes].sort((a, b) => (reverse ? b - a : a - b)).slice(0, length);

    const chatMessages = await chatMessagesStore.asyncGetMessages(cgid, indexes, true, 'index');
    isLoading = false;
    return chatMessages;
}

/**
 * 会话消息列表存储中心
 */
class ChatMessagesListStore extends DataStore<string, MessageListRecord, MessageListRecord> {
    /**
     * 空闲任务管理器，用于执行数据库更新操作
     */
    private idleTasks = new IdleTaskList();

    /**
     * 需要在会话数据就绪时获取列表的会话
     */
    private needFetchListOnChatsReady = new Set<string>();

    /**
     * 某会话的图片消息
     */
    private imageMessageMap = new Map<string, ChatMessage[]>();

    /**
     * 创建一个会话消息数据存储中心实例
     */
    constructor() {
        super('ChatMessagesList', {channelDelayTime: 50, key: 'cgid'});

        // 绑定消息存储回调函数
        chatMessagesStore.afterStoreChatMessages(this.handleStoreChatMessages.bind(this));

        // 处理会话数据就绪事件
        chatsStore.subscribeChatsReadyEvent(this.handleChatsReady.bind(this));

        // 处理会话变更事件
        chatsStore.subscribeAny(chats => {
            const chatsNeedUpdate = [];
            for (const chat of chats) {
                const item = this.getItemFromCache(chat.gid);
                if (!item) {
                    continue;
                }

                // 如果当前记录状态表示能够加载更多历史消息，但是会话变更后已经无法加载更多历史消息
                // chat.isFirstMessageInLatest 为判定会话第一条消息是否在最近消息 ID 列表中，如果在，表示无法加载更多消息到最新消息列表了
                const chatCanLoadMore = chat.lastMessageIndex && !chat.latestMessageIndexes.includes(1);
                if (item.canLoadMore && !chatCanLoadMore) {
                    chatsNeedUpdate.push(item);
                }
            }
            if (chatsNeedUpdate.length) {
                this.update(chatsNeedUpdate.map(x => x.cgid));
            }
        });
    }

    /**
     * 处理会话消息数据就绪事件
     */
    handleChatsReady() {
        if (!this.needFetchListOnChatsReady.size) {
            return;
        }
        const gids = [...this.needFetchListOnChatsReady];
        this.needFetchListOnChatsReady.clear();

        this.update(gids);
    }

    /**
     * chatMessagesStore 存储完成时的回调函数
     * @param chat 会话对象
     * @param storeResult 存储结果
     */
    handleStoreChatMessages(
        chat: Chat,
        storeResult: {
            lastReadChanged: boolean;
            updated: boolean;
            unreadAfter: number[];
            unreadBefore: number[];
            newUnread: number[];
            newMessages: number[];
            frozenCanceled: boolean;
            deletedLocalMessages: number[];
        }
    ) {
        if (chat.isDeleted || !chat.isVisible) {
            return;
        }
        // 历史同步期间不驱动主聊天窗口 update，减少重算与重渲染
        if (chatMessagesStore.isSynchronizing) {
            return;
        }

        const {lastReadChanged, newUnread, newMessages} = storeResult;

        if (lastReadChanged || newUnread?.length || newMessages?.length) {
            this.update(chat.gid);
        }

        const {list} = this.getList(chat.gid);
        // TODO 这里可能要精确的比对两个列表的元素
        if (chat.latestMessageIndexes.length !== list.length || chat.latestMessageIndexes[0] !== list[0]) {
            this.update(chat.gid);
        }
    }

    /**
     * 重置数据存储中心
     * @override
     * @param identify 数据存储标识，通常为当前连接的服务器地址
     */
    override reset(identify: string): boolean {
        const identifyChanged = super.reset(identify);

        this.needFetchListOnChatsReady.clear();
        this.idleTasks.cancelAll();

        if (DEBUG_I) {
            console.collapse('STORE.ChatMessagesList', 'pinkBg', 'reset', 'pinkPale', identifyChanged, '');
            console.log('identify', identify);
            console.groupEnd();
        }
        return true;
    }

    /**
     * 更新会话消息列表记录
     * @param cgids 会话 GID 列表
     * @param loading 是否更新 loading 状态
     * @returns 消息会话列表记录
     */
    update(cgids?: string|string[], loading?: boolean): MessageListRecord[] {
        if (!cgids) {
            cgids = this.allKeys as string[];
        }
        if (!Array.isArray(cgids)) {
            cgids = [cgids];
        }

        const recordsNeedStore = [];
        const allRecords = [];
        const needCheckHistory = [];
        for (const cgid of cgids) {
            const oldRecord = this.getItemFromCache(cgid);
            const loadingState = typeof loading === 'boolean' ? loading : (oldRecord ? oldRecord.loading : false);
            const record = getChatMessageListRecord(cgid, loadingState);
            if (!oldRecord || (!isSameMessageListRecord(record, oldRecord) && !isMessageListContained(oldRecord, record))) {
                recordsNeedStore.push(record);
                allRecords.push(record);
            } else {
                allRecords.push(oldRecord);
            }

            // 旧的数据过期，通常是注销后重新登录了，此时要重新检查历史记录范围，否则可能导致注销后期间收到的消息无法更新
            if (oldRecord?.expired) {
                needCheckHistory.push(cgid);
            }
        }
        if (recordsNeedStore.length) {
            this.store(recordsNeedStore);
            if (DEBUG_I) {
                console.collapse('STORE.ChatMessagesList', 'pinkBg', 'store', 'pinkPale', recordsNeedStore.length, '');
                console.log('recordsNeedStore', recordsNeedStore);
                console.log('allRecords', allRecords);
                console.groupEnd();
            }
        }

        return allRecords;
    }

    /**
     * 获取会话消息列表记录
     * @param cgid 会话 GID
     * @returns 消息会话列表记录
     */
    getList(cgid: string) {
        const oldRecord = this.getItemFromCache(cgid);
        if (oldRecord) {
            return oldRecord;
        }

        const record = getChatMessageListRecord(cgid, true);
        this.store(record, {skipPublish: true});

        if (chatsStore.isReady) {
            const chat = chatsStore.getChat(cgid, false);
            if (chat.lastMessageIndex) {
                loadMessages(cgid, chat.lastMessageIndex + 1);
            }
        } else {
            this.needFetchListOnChatsReady.add(cgid);
        }

        return record;
    }

    /**
     * 根据给定的 cgid 设置图片消息列表
     * @param cgid 会话gid
     * @returns 对应的图片消息列表
     */
    setImageMessageMap(cgid: string) {
        const messagesRecord = this.getList(cgid);
        const messageIDs = messagesRecord?.list;
        if (!messageIDs) {
            return null;
        }
        const messages = chatMessagesStore.getMessages(messageIDs, cgid, 'index');
        if (!messages?.length) {
            return null;
        }

        const imageMessages = messages.filter(m => m?.isImageContent);
        if (imageMessages.length) {
            this.imageMessageMap.set(cgid, imageMessages);
        }
        return imageMessages;
    }

    /**
     * 获取给定图片消息的相邻图片
     * @param messageID 消息 ID
     * @param forceUpdate 是否强制更新
     * @returns 相邻图片对象
     */
    getPrevAndNextImageMessage(messageID: number, forceUpdate = false) {
        const message = chatMessagesStore.getMessage(messageID);
        if (!message?.isImageContent) {
            return null;
        }

        const {cgid} = message;

        const imageMessages = !this.imageMessageMap.has(cgid) || forceUpdate
            ? this.setImageMessageMap(cgid)
            : this.imageMessageMap.get(cgid);

        if (!imageMessages) {
            return null;
        }

        const index = imageMessages.findIndex(m => m.id === messageID);
        if (index === -1) {
            return null;
        }

        let prevImageMessage: ChatMessage;
        let nextImageMessage: ChatMessage;
        let prevIndex = index;
        let nextIndex = index;

        do {
            prevImageMessage = imageMessages[--prevIndex];
        } while (prevImageMessage?.retracted);

        do {
            nextImageMessage = imageMessages[++nextIndex];
        } while (nextImageMessage?.retracted);

        return {
            prev: prevImageMessage,
            next: nextImageMessage,
        };
    }

    /**
     * 加载指定会话更多消息到列表记录中
     * @param cgid 会话 GID
     * @param length 加载数量
     * @returns 操作是否成功
     */
    async loadMoreList(cgid: string, length = 20) {
        if (!chatsStore.isReady) {
            if (DEBUG) {
                console.collapse('STORE.ChatMessagesList', 'pinkBg', `Load more list for chat ${cgid} failed`, 'pinkPale', 'chatsStore is not ready', 'pink');
                console.trace('store', this);
                console.groupEnd();
            }
            return false;
        }

        const chat = chatsStore.getChat(cgid);
        if (!chat) {
            if (DEBUG) {
                console.collapse('STORE.ChatMessagesList', 'pinkBg', `Load more list for chat ${cgid} error`, 'redPale', 'Cannot found the chat', 'red');
                console.trace('store', this);
                console.groupEnd();
            }
            return false;
        }

        // 本地一对一会话跳过请求服务器
        if (chat.isLocal) {
            return false;
        }

        const {latestMessageIndexes} = chat;

        this.update(cgid, true);
        const fromIndex = (latestMessageIndexes[0] ?? chat.lastMessageIndex) - 1;
        if (fromIndex < 1) {
            return false;
        }
        try {
            const chatMessages = await loadMessages(cgid, fromIndex, {length});
            if (chatMessages) {
                chat.setLatestMessages(chatMessages, {isFocusedActiveChat: isOpenedActiveChat(chat.gid)});
            }
            chatsStore.store(chat);
        } catch (error) {
            if (DEBUG) {
                console.collapse('STORE.ChatMessagesList', 'pinkBg', 'load more Error', 'redPale', String(error), 'red');
                console.error('error', error);
                console.log('cgid', cgid);
                console.groupEnd();
            }
        }
        this.update(cgid, false);

        return true;
    }

    /**
     * 缩小给定会话的消息列表记录长度
     * @param cgid 会话 GID
     * @param length 要保留的长度
     */
    shrinkList(cgid: string, length = 100) {
        const record = this.getItemFromCache(cgid);
        if (!record) {
            return;
        }

        const {list} = record;
        if (list.length > length) {
            const chat = chatsStore.getChat(cgid);
            chat.shrinkMessageIndexList();
            chatsStore.store(chat);

            record.list = list.slice(-length, list.length);
            this.store(record);
        }
    }
}

/**
 * 会话消息数据存储中心
 */
const chatMessagesListStore = new ChatMessagesListStore();

// 监听数据库初始化完成事件
setCallbackOnInitedDB(chatMessagesListStore.reset.bind(chatMessagesListStore));

if (DEBUG) {
    global.$chatMessagesListStore = chatMessagesListStore;
}

export default chatMessagesListStore;
export type {ChatMessagesListStore};
