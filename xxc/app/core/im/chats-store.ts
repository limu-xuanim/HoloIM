import {TYPES as ChatMessageTYPES} from '~/app/core/im/chat-message';
import IdleTaskList from '../../utils/idle-task-list';
import {EventChannel} from '../../utils/event-channel';
import {caculateScore} from '../../utils/string-helper';
import {createDate, TIME_DAY} from '../../utils/date-helper';
import Chat, {type ChatLike, TYPES} from './chat';
import dexie, {beginDBBusyTask, endDBBusyTask, setCallbackOnInitedDB} from '../db';
import {DataStore} from '../db/datastore';
import {getCurrentUser, getCurrentUserID, onUserLogout} from '../profile';
import {sortChats, getChatPinYinName, getOne2OneChatGid} from './chat-helper';
import membersStore from '../members/members-store';
import socket from '../server/socket';
import Lang from '../lang';
import DelayAction from '../../utils/delay-action';
import {registerCommand} from '../commander';
import platform from '../../platform';
import {emitUnreadMessagesChange, tryEmitUnreadMessagesChange} from './chat-message-notice';
import {isOpenedActiveChat} from './chat-active-state';
import {syncLastReadMessageForChat} from './chats-server-api';
import {isEmptyString} from '~/app/utils/check-empty';

/**
 * 会话数据就绪时间
 */
const EVENT_CHATS_READY = Symbol('chats-ready');

/**
 * 默认标记为最近联系最大过去时间，单位毫秒
 */
const MAX_RECENT_TIME = 7 * TIME_DAY;

/**
 * 从服务器搜索会话（搜索联系人新建会话）
 * @param searchValue 搜索关键字，多个关键字使用空格分隔
 * @param excludeMemberIdList  排除人员ID列表
 * @returns 会话对象数组
 */
async function searchChatsFromRemote(searchValue: string|string[], excludeMemberIdList = new Set<number>()): Promise<Chat[]> {
    const currentUser = getCurrentUser();

    if (searchValue === '' || !currentUser) {
        return [];
    }

    const isArray = Array.isArray(searchValue);
    if (isArray && searchValue.length === 0) {
        return [];
    }

    const searchString = isArray ? searchValue.join(' ') : searchValue;

    if (searchString === '') {
        return [];
    }

    excludeMemberIdList.add(currentUser.id);

    try {
        let searchResult = await membersStore.searchFromRemote(searchString);
        if (excludeMemberIdList.size > 0) {
            searchResult = searchResult.filter((member) => !excludeMemberIdList.has(member.id));
        }

        const remoteChats = searchResult.map((member) => {
            return new Chat({
                members: new Set([currentUser.id, member.id]),
                createdBy: currentUser.account,
                type: Chat.TYPES.one2one,
                name: member.displayName,
            });
        });

        for (const chat of remoteChats) {
            chat.score = 0;
            if (isArray) {
                for (const s of searchValue) {
                    chat.score += caculateScore(s, chat.name);
                }
            } else {
                chat.score += caculateScore(searchValue, chat.name);
            }
        }
        return remoteChats;
    } catch (e) {
        console.error('Search members form server error', e);
        return [];
    }
}

/**
 * 创建会话对象
 * @param chat 会话对象
 * @returns 会话对象
 */
export function createChat(chat: ChatLike|Chat) {
    if (!(chat instanceof Chat)) {
        chat = new Chat(chat);
    }

    const isEmptyName = isEmptyString(chat.name);
    if (chat.isOne2One) {
        const currentUser = getCurrentUser();
        if (!chat.theOtherMemberID) {
            const currentUserId = currentUser.id;
            chat.theOtherMemberID = chat.isPrivate ? currentUserId : Array.from(chat.members).find(x => x !== currentUserId);
        }
        const theOtherMember = membersStore.getItemFromCache(chat.theOtherMemberID);
        if (theOtherMember) {
            if (isEmptyName) {
                chat.name = chat.isPrivate ? Lang.format('chat.privateChat.name', currentUser.displayName) : theOtherMember.displayName;
            }
            if (theOtherMember.isDeleted) {
                chat.isDeleted = true;
            }
        }
    } else if (isEmptyName) {
        if (chat.isSystem) {
            chat.name = Lang.string('chat.systemGroup.name');
        } else {
            chat.name = Lang.format('chat.group.tempName', chat.id);
        }
    }

    return chat;
}

/**
 * 从远端根据 gid 获取 群组成员
 * @param gid gid
 * @returns 群成员
 */
export async function fetchChatMembersFromRemote(gid: string): Promise<number[]> {
    try {
        const chat = await socket.sendAndListen({method: 'chatgetmembers', params: [gid]});
        return chat.members;
    } catch {
        return [];
    }
}

/**
 * 从远端根据 gid 获取会话信息
 * @param gid
 * @returns 群成员
 */
export async function fetchChatFromRemote(gid: string): Promise<ChatLike> {
    try {
        const chat = await socket.sendAndListen({method: 'chatgetbygid', params: [gid]});
        return chat;
    } catch {
        return {};
    }
}

/**
 * 超级管理员从服务器获取所有的群组信息
 * @returns 所有群组
 */
export async function fetchChatListFromRemote(): Promise<ChatLike> {
    const user = getCurrentUser();
    if (!user) {
        return {};
    }

    if (user.admin === 'super') {
        try {
            return await socket.sendAndListen({
                    method: 'chatsearch',
                    params: ['', {pageID: 1, recPerPage: 9999}, '', true]
                });
        } catch {
            return {};
        }
    }
    return {};
}

/**
 * 会话数据存储中心
 */
class ChatsStore extends DataStore<string, Chat, ChatLike> {
    /**
     * 空闲任务管理器，用于执行数据库更新操作
     */
    _idleTasks = new IdleTaskList();

    /**
     * 未读消息通知变更事件订阅
     */
    _noticeChannel = new EventChannel();

    /**
     * 保存数据到数据库延时任务
     */
    _databaseSaveTask = new DelayAction(this.saveChatsToDatabase.bind(this), 200);

    /**
     * 需要保存到数据库的会话 GID 集合
     */
    _chatsNeedSave = new Set<string>();

    /**
     * 会话数据是否就绪
     */
    _ready = false;

    private _fetchingMembersTasks: any;

    /**
     * 创建一个会话数据存储中心实例
     */
    constructor() {
        super('Chat', {key: 'gid', channelDelayTime: 100});
        // 订阅成员变更事件并更新一对一会话信息
        membersStore.subscribeAny(this.handleMemberChange.bind(this));
    }

    /**
     * 获取会话数据是否就绪
     */
    get isReady() {
        return this._ready;
    }

    /**
     * 格式化会话对象
     * @override
     * @param chat 会话对象
     * @returns 会话对象
     */
    normalizeItem = (chatLike: ChatLike|Chat) => {
        const chat = createChat(chatLike);
        const cacheChat = this.getItemFromCache(chat.gid);

        if (cacheChat) {
            if (!chat.members.size && chat.editedDate === cacheChat.editedDate) {
                chat.setMembers(cacheChat.members);
            }

            if (chat.isOne2One && !chat.name && cacheChat.name) {
                chat.name = cacheChat.name;
            }

            chat.lastActiveTime = Math.max(chat.lastActiveTime, cacheChat.lastActiveTime);
            chat.lastAccessTime = Math.max(chat.lastAccessTime, cacheChat.lastAccessTime);
            chat.setLastReadMessageIndex(Math.max(chat.lastReadMessageIndex, cacheChat.lastReadMessageIndex));
            // TODO 这里可能会影响发送失败的消息在本地的展示
            // chat.lastMessageIndex = Math.max(chat.lastMessageIndex, cacheChat.lastMessageIndex);

            const lastMessageInfo = cacheChat.$get('lastMessageInfo');
            if (lastMessageInfo?.type === ChatMessageTYPES.notify && typeof lastMessageInfo?.data === 'string') {
                try {
                    chat.$set('lastMessageInfo', {...lastMessageInfo, data: JSON.parse(lastMessageInfo.data)});
                } catch {
                    chat.$set('lastMessageInfo', lastMessageInfo);
                }
            } else {
                chat.$set('lastMessageInfo', lastMessageInfo);
            }

            for (const propName of ['localMessages', 'theOtherMemberID'] as const) {
                chat.$set(propName, cacheChat.$get(propName));
            }
        }
        return chat;
    };

    /**
     * 重置数据存储中心
     * @param identify 数据存储标识，通常为当前连接的服务器地址
     */
    override reset(identify: string) {
        const identifyChanged = super.reset(identify);

        if (identifyChanged) {
            this._idleTasks.cancelAll();
            this._databaseSaveTask.cancel();
        }
        this._ready = false;

        if (DEBUG_I) {
            console.collapse('STORE.Chats', 'pinkBg', 'reset', 'pinkPale', identifyChanged, '');
            console.log('identify', identify);
            console.groupEnd();
        }
        return identifyChanged;
    }

    /**
     * 处理成员变更事件，同步更新一对一会话名称
     * @param members 变更的成员列表
     */
    handleMemberChange(members: Member[]) {
        const updatedChats = [];
        for (const member of members) {
            const {cgid} = member;
            const chat = this.getItemFromCache(cgid);
            if (chat) {
                let chatChanged = false;
                const {displayName, isDeleted} = member;
                if (chat.name !== displayName) {
                    chat.name = displayName;
                    chatChanged = true;
                }
                if (isDeleted && !chat.isDeleted) {
                    chat.isDeleted = true;
                    chatChanged = true;
                    this.muteChatUnreadMessages(cgid);
                }

                if (chatChanged) {
                    updatedChats.push(chat);
                }
            }
        }
        if (updatedChats.length) {
            this.store(updatedChats);
        }
    }

    /**
     * 尝试获取会话的成员列表
     * @param gid 会话 GID
     * @returns 使用 Promise 异步返回处理结果
     */
    async tryFetchChatMembers(gid: string): Promise<Set<number>> {
        const chat = this.getChat(gid);
        if (!chat) {
            return null;
        }
        if (chat.members.size) {
            return chat.members;
        }

        if (chat.isSystem) {
            chat.setMembers(membersStore.allKeys);
        }

        if (!this._fetchingMembersTasks) {
            /**
             * 正在执行获取会话成员列表的会话
             */
            this._fetchingMembersTasks = new Map();
        }

        if (this._fetchingMembersTasks.has(gid)) {
            return new Promise(resolve => {
                this._fetchingMembersTasks.get(gid).push(resolve);
            });
        }
        this._fetchingMembersTasks.set(gid, []);
        await this._idleTasks.requestAndWait(async () => {
            await fetchChatMembersFromRemote(gid);
            if (this._fetchingMembersTasks?.has(gid)) {
                const callbacks = this._fetchingMembersTasks.get(gid);
                if (callbacks.length) {
                    for (const cb of callbacks) {
                        cb(chat.members);
                    }
                }
                this._fetchingMembersTasks.delete(gid);
            }
        }, {name: 'fetchChatMembers', timeout: 3000});

        if (this._fetchingMembersTasks && !this._fetchingMembersTasks.size) {
            this._fetchingMembersTasks = null;
        }
        return chat.members;
    }

    /**
     * 存储会话数据
     * @param chats 要存储的数据对象列表
     * @param options 存储选项
     * @param options.putToDatabase 是否将数据更新到数据库，如果为 reset 则清空老的数据，默认为 true
     * @returns 存储的数据对象列表
     */
    override store(chatLikes: Chat|ChatLike|Array<Chat|ChatLike>, options: Partial<{putToDatabase: boolean|'reset';}> = {}) {
        const {putToDatabase = true} = options;

        if (putToDatabase === 'reset') {
            this._cache.clear();
        }

        const chats = super.store(chatLikes, {normalizeFunc: this.normalizeItem});

        if (chats && putToDatabase) {
            this.planToSaveChatsToDatabase(chats.map(x => x.gid), putToDatabase === 'reset');
        }

        if (DEBUG_I) {
            console.collapse('STORE.Chat', 'pinkBg', 'store', 'pinkPale', chats ? chats.length : 0, '');
            console.trace('chats', chats ? [...chats] : null);
            console.log('store', this);
            console.groupEnd();
        }

        return chats || [];
    }

    /**
     * 获取所有未读消息数目或指定会话的未读消息数目
     * @param  callback 回调函数
     * @returns 未读消息总数
     */
    getUnreadMessageCount(callback?: (chat: Chat) => number|false) {
        if (!this._ready) {
            return 0;
        }

        let count = 0;
        const isWindowFocus = platform.call('ui.isWindowFocus');
        if (callback) {
            // biome-ignore lint/complexity/noForEach: <explanation>
            this.forEach(chat => {
                const result = callback(chat);
                if (result === false) {
                    return;
                }
                if (typeof result === 'number') {
                    count += result;
                }
            });
            return count;
        }

        // biome-ignore lint/complexity/noForEach: <explanation>
        this.forEach(chat => {
            const {unreadMessagesCount} = chat;
            if (!unreadMessagesCount || chat.isDeleted || chat.mute || chat.isDismissed || (isWindowFocus && isOpenedActiveChat(chat.gid))) {
                return;
            }
            count += unreadMessagesCount;
        });
        return count;
    }

    /**
     * 清除指定会话的所有未读消息和通知
     * @param gid 会话 GID
     * @param options 选项
     * @param options.mustActive 会话必须处于激活状态
     * @returns 如果为 true，表示设置成功
     */
    muteChatUnreadMessages(gid: string) {
        const chat = this.getChat(gid);
        if (!chat) {
            return false;
        }

        if (!isOpenedActiveChat(gid) || !platform.call('ui.isWindowFocus')) {
            return false;
        }

        if (chat.muteUnreadMessages()) {
            this.store(chat);
            emitUnreadMessagesChange(this.getUnreadMessageCount());
            syncLastReadMessageForChat(chat);
            return true;
        }
        tryEmitUnreadMessagesChange(this.getUnreadMessageCount());
        return false;
    }

    /**
     * 订阅所有会话未读通知变更事件
     * @param listener 监听函数
     * @returns 订阅 ID
     */
    subscribeChatsReadyEvent(listener: (count: number) => void) {
        return this._noticeChannel.subscribe(EVENT_CHATS_READY, listener);
    }

    /**
     * 取消订阅未读通知变更事件
     * @param subscriptionID 订阅 ID
     * @returns 如果为 true 则取消订阅成功
     */
    unsubscribeChatsReadyEvent(subscriptionID: symbol) {
        return this._noticeChannel.unsubscribe(subscriptionID);
    }

    /**
     * 稍后将指定会话保存到数据库
     * @param chats 要保存的会话列表
     * @param clear 是否在保存之前清空本地数据
     */
    planToSaveChatsToDatabase(chats: string[], clear = false) {
        if (clear) {
            this._chatsNeedSave.clear();
            this._chatsNeedSave.add('clear');
        }
        for (const chat of chats) {
            this._chatsNeedSave.add(chat);
        }
        this._databaseSaveTask.do();
    }

    /**
     * 将更改的会话保存到数据库
     */
    async saveChatsToDatabase() {
        if (!this._chatsNeedSave.size) {
            return;
        }
        const chatsNeedDelete = [];
        const chatsNeedSave = [];
        let needClear = false;
        for (const gid of this._chatsNeedSave) {
            if (gid === 'clear') {
                needClear = true;
                continue;
            }

            const chat = this.getChat(gid);
            if (!chat) {
                continue;
            }

            if (chat.isDeleted) {
                chatsNeedDelete.push(chat.gid);
            } else {
                chatsNeedSave.push(chat.plain());
            }
        }

        this._chatsNeedSave.clear();

        beginDBBusyTask();
        try {
            const chatTable = dexie.database.chats;

            if (needClear) {
                await chatTable.clear();
            }

            if (chatsNeedSave.length) {
                await chatTable.bulkPut(chatsNeedSave);
            }

            if (chatsNeedDelete.length) {
                await chatTable.bulkDelete(chatsNeedDelete);
            }

            if (DEBUG_I) {
                console.collapse('STORE.Chat', 'pinkBg', 'save chat to chatTable', 'pinkPale', chatsNeedDelete.length + chatsNeedSave.length, '');
                console.log('needClear', needClear);
                console.log('chatsNeedDelete', chatsNeedDelete);
                console.log('chatsNeedSave', chatsNeedSave);
                console.log('store', this);
                console.groupEnd();
            }
        } catch (error) {
            if (DEBUG) {
                console.collapse('STORE.Chat', 'pinkBg', 'save chat to chatTable Error', 'redPale', String(error), 'red');
                console.error('error', error);
                console.log('needClear', needClear);
                console.log('chatsNeedDelete', chatsNeedDelete);
                console.log('chatsNeedSave', chatsNeedSave);
                console.log('store', this);
                console.groupEnd();
            }
        }
        endDBBusyTask();
    }

    /**
     * 从数据库加载会话数据，并和服务器上的数据进行合并
     * @param remoteChats 服务器上的会话数据
     * @returns 使用 Promise 异步返回合并后的会话数据
     */
    private async mergeChatsFromDatabase(remoteChats: ChatLike[]) {
        const chatsDatabase = dexie.database.chats;
        const identify = this._identify;

        const chatsInDb = await chatsDatabase.toArray();
        if (identify !== this._identify) {
            return;
        }

        if (!chatsInDb?.length) {
            return remoteChats;
        }

        /**
         * 所有远程会话 GID 集合
         */
        const chatsMap = remoteChats.reduce((map, chat) => map.set(chat.gid, chat), new Map<string, ChatLike>());

        // 标记为待删除的会话 GID
        const chatsNeedDelete = new Set<string>();
        // 标记需要清空消息的会话 GID (服务器数据比本地旧)
        const chatsNeedClearMessages = new Set<string>();

        for (const chatInDb of chatsInDb) {
            const {gid} = chatInDb;
            // 如果数据库中的会话已不在远程会话中，则标记为待删除
            if (!chatsMap.has(gid)) {
                chatsNeedDelete.add(gid);
                continue;
            }

            const chat = chatsMap.get(gid);

            // 检查服务器返回的lastMessage是否小于本地的lastMessage
            // 如果是，说明服务器上的数据被清空或回滚，需要清空本地数据
            const remoteLastMessage = chat.lastMessageInfo?.index || 0;
            const localLastMessage = chatInDb.lastMessageInfo?.index || 0;
            if (remoteLastMessage >= 0 && localLastMessage > 0 && remoteLastMessage < localLastMessage) {
                // 标记需要清空消息
                chatsNeedClearMessages.add(gid);
                // 不使用本地的lastMessageInfo
                delete chatInDb.lastMessageInfo;
                delete chatInDb.lastReadMessageIndex;

                if (DEBUG_I) {
                    console.log('Chat lastMessage rollback detected:', {
                        gid,
                        remote: remoteLastMessage,
                        local: localLastMessage
                    });
                }
            }

            // 如果远程会话上次编辑时间晚于本地会话上次编辑时间，则删除本地成员列表信息
            if (chat.editedDate * 1000 > chatInDb.editedDate) {
                delete chatInDb.members;
            }

            // 将本地会话数据和远程会话数据合并
            const propsName = new Set(Object.keys(chatInDb) as Array<keyof ChatLike>);
            if (propsName.has('name')) {
                if (!chat.name && chat.type === TYPES.one2one) {
                    chat.name = chatInDb.name;
                }
                propsName.delete('name');
            }

            if (propsName.has('lastActiveTime')) {
                chat.lastActiveTime = Math.max(chatInDb.lastActiveTime, createDate(chat.lastActiveTime).getTime());
                propsName.delete('lastActiveTime');
            }
            // 处理最后的消息为非整数 index (非会话原生消息) 的情况
            // 如果需要清空消息，则不使用本地的lastMessageInfo
            if (!chatsNeedClearMessages.has(gid) && propsName.has('lastMessageInfo') && chatInDb.lastMessageInfo?.index > chat.lastMessageInfo?.index) {
                chat.lastMessageInfo = chatInDb.lastMessageInfo;
            }
            if (!chatsNeedClearMessages.has(gid) && propsName.has('lastReadMessageIndex') && chatInDb.lastReadMessageIndex > chat.lastReadMessageIndex) {
                chat.lastReadMessageIndex = chatInDb.lastReadMessageIndex;
            }
            for (const propName of propsName) {
                const propInDbValue = chatInDb[propName];
                const propValue = chat[propName];
                if (propValue === undefined && propInDbValue !== undefined) {
                    (chat as any)[propName] = propInDbValue;
                }
            }
        }

        if (chatsNeedDelete.size) {
            // 删除服务器上没有返回但本地数据库中存在的会话（通常该会话已经从其他位置删除了）
            await chatsDatabase.bulkDelete([...chatsNeedDelete]);
            // 同时清空这些会话的所有消息
            await this.clearMessagesForChats([...chatsNeedDelete]);
        }

        // 清空需要删除消息的会话的所有消息
        if (chatsNeedClearMessages.size) {
            await this.clearMessagesForChats([...chatsNeedClearMessages]);
        }

        if (DEBUG_I) {
            console.collapse('STORE.Chat', 'pinkBg', 'merge chats from chatTable', 'pinkPale', chatsInDb.length, '');
            console.log('chatsMap', chatsMap);
            console.log('chatsInDb', chatsInDb);
            console.log('remoteChats', remoteChats);
            console.log('chatsNeedDelete', chatsNeedDelete);
            console.log('chatsNeedClearMessages', chatsNeedClearMessages);
            console.log('store', this);
            console.groupEnd();
        }

        return [...chatsMap.values()];
    }

    /**
     * 清空指定会话的所有消息
     * @param gids 会话 GID 列表
     */
    private async clearMessagesForChats(gids: string[]) {
        if (!gids || gids.length === 0) {
            return;
        }

        // 导入messagesStore来清空内存缓存
        const messagesStore = (await import('./chat-messages-store')).default;

        beginDBBusyTask();
        try {
            const messageTable = dexie.database.chatMessages;

            // 删除这些会话的所有消息
            for (const gid of gids) {
                await messageTable.where('cgid').equals(gid).delete();
            }

            // 同时清空内存缓存
            messagesStore.clearCacheForChats(gids);

            if (DEBUG_I) {
                console.collapse('STORE.Chat', 'pinkBg', 'clear messages for chats', 'pinkPale', gids.length, '');
                console.log('gids', gids);
                console.groupEnd();
            }
        } catch (error) {
            if (DEBUG) {
                console.collapse('STORE.Chat', 'pinkBg', 'clear messages for chats Error', 'redPale', String(error), 'red');
                console.error('error', error);
                console.log('gids', gids);
                console.groupEnd();
            }
        }
        endDBBusyTask();
    }

    /**
     * 存储服务器返回的会话列表
     * @param chatLikes 会话对象列表
     */
    async storeChatsFromRemote(chatLikes: ChatLike[]) {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            return;
        }

        const currentUserID = currentUser.id;
        const validTypes = new Set(Object.values(TYPES));
        chatLikes = chatLikes.filter(chat => validTypes.has(chat.type as TYPES));
        const cgidSet = new Set(chatLikes.map(x => x.gid));

        // 添加私人会话
        if (!cgidSet.has(`${currentUserID}&${currentUserID}`)) {
            chatLikes.push({
                gid: `${currentUserID}&${currentUserID}`,
                type: TYPES.one2one,
                lastActiveTime: Date.now() - ((1000 * 60 * 60 * 24 * 3) / 2),
                members: [currentUserID],
                name: Lang.format('chat.privateChat.name', currentUser.displayName),
            });
        }

        if (DEBUG_I) {
            console.collapse('STORE.Chat', 'pinkBg', 'store chats from remote', 'pinkPale', chatLikes.length, '');
            console.log('chats', [...chatLikes]);
            console.log('store', this);
            console.groupEnd();
        }

        for (const chat of chatLikes) {
            const oldChat = this.getChat(chat.gid);
            if (oldChat) {
                chat.latestMessageIndexes = oldChat.latestMessageIndexes;
            }
        }

        // 从数据库加载会话数据，并和服务器上的数据进行合并
        const identify = this._identify;
        chatLikes = await this.mergeChatsFromDatabase(chatLikes);
        if (identify !== this._identify) {
            return;
        }

        const chats = this.store(chatLikes, {putToDatabase: 'reset'});

        this._ready = true;
        this._noticeChannel.publish(EVENT_CHATS_READY);

        emitUnreadMessagesChange(this.getUnreadMessageCount());

        return chats;
    }

    /**
     * 从缓存中获取会话
     * @param gid 会话 GID
     * @param returnLocalOne2One 是否返回本地一对一会话
     * @param getFromRemote 是否从远程获取
     * @returns 会话对象
     */
    getChat(gid: string, returnLocalOne2One = true, getFromRemote = false) {
        let chat = this.getItemFromCache(gid);
        if (chat) {
            return chat;
        }

        const currentUser = getCurrentUser();
        if (!currentUser) {
            return null;
        }
        if (returnLocalOne2One && /^\d+&\d+$/.test(gid)) {
            const members = gid.split('&').map(x => Number.parseInt(x, 10));
            if (!members.includes(currentUser.id)) {
                return null;
            }
            [chat] = this.store({
                gid,
                members,
                createdBy: currentUser.account,
                type: Chat.TYPES.one2one,
                theOtherMemberID: members.find(x => x !== currentUser.id),
            }, {putToDatabase: false});
            return chat;
        }
        if (getFromRemote) { // 被合并的会话从服务器上查找
            fetchChatFromRemote(gid)
                .then(remoteChat => {
                    this.store(new Chat(remoteChat), {putToDatabase: false});
                })
                .catch(console.error);
        }
        return chat;
    }

    /**
     * 从缓存中获取联系人对应的会话
     * @param memberID 联系人 ID
     * @param returnLocalOne2One 是否返回本地一对一会话
     * @returns 会话对象
     */
    getContactChat(memberID: number, returnLocalOne2One = true) {
        const currentUserID = getCurrentUserID();
        if (currentUserID === memberID) {
            return null;
        }
        return this.getChat(getOne2OneChatGid(memberID, currentUserID), returnLocalOne2One);
    }

    /**
     * 从缓存中获取会话列表
     * @param gids 会话 GID 列表
     * @returns 会话列表
     */
    getChats(gids: string[]) {
        return gids.map(gid => this.getChat(gid));
    }

    /**
     * 获取所有会话
     * @param sortRules 排序规则，如果为 false 则不进行排序
     * @returns 会话列表
     */
    getAllChats(sortRules: Parameters<typeof sortChats>[1] = 'default') {
        const allChats = this.all.filter(chat => !chat.isDeleted);
        if (sortRules) {
            return sortChats(allChats, sortRules);
        }

        return allChats;
    }

    /**
     * 从缓存中查询会话实例
     * @param condition 查询条件
     * @param options 查询选项
     * @param options.sortRules 是否对结果进行排序，如果为 false 则不进行排序，默认为 false
     * @param options.limit 返回结果最多数目，如果为 0 则不限制，默认为 0
     * @param options.includeDeleted 是否包含已删除的会话，默认为 false
     * @param options.excludeLocal 是否排出本地会话，默认为 false
     * @returns 会话实例查询结果
     */
    queryChats(
        condition: (chat: Chat, gid: string) => boolean,
        options: Partial<{
            sortRules: SortChatsOrder;
            limit: number;
            includeDeleted: boolean;
            excludeLocal: boolean;
        }> = {}
    ) {
        if (!this.size) {
            return [];
        }

        const {sortRules = 'default', limit = 0, includeDeleted = false, excludeLocal = false} = options;

        let chats = this.filter((chat, gid) => {
            // TODO 需要排查一下为什么会有这种 GID 的会话
            if (/^\d+&$/.test(chat.gid)) {
                return false;
            }
            if (!includeDeleted && chat.isDeleted) {
                return false;
            }
            if (excludeLocal && chat.isLocal && !chat.isPrivate) {
                return false;
            }
            return condition(chat, gid);
        });

        if (chats.length) {
            if (sortRules) {
                chats = sortChats(chats, sortRules);
            }

            if (limit && chats.length > limit) {
                chats = chats.slice(0, limit);
            }
        }

        return chats;
    }

    /**
     * 搜索会话
     * @param searchKeys 搜索关键字，多个关键字使用空格分隔
     * @param options 选项
     * @param options.chatType 会话类型，包括 contacts（联系人），groups（讨论组）
     * @param options.excludeMemberIdList  排除人员ID列表
     * @param options.includeReadonly 是否包含只读的会话
     * @param options.searchFromRemote 是否启用服务器搜索成员
     * @returns 会话对象数组
     */
    async searchChats(
        searchKey: string,
        options: Partial<{
            chatType: ''|'contacts'|'groups';
            excludeMemberIdList: false|Set<number>;
            includeReadonly: boolean;
            searchFromRemote: boolean;
        }> = {}
    ) {
        if (isEmptyString(searchKey)) {
            return [];
        }
        const searchKeys = searchKey.trim().toLowerCase().split(' ');
        if (!searchKeys.length) {
            return [];
        }

        const {chatType = '', excludeMemberIdList = false, includeReadonly = true, searchFromRemote = false} = options;
        const isContactsType = chatType === 'contacts';
        const isGroupsType = chatType === 'groups';
        const hasChatType = isContactsType || isGroupsType;
        const currentUser = getCurrentUser();
        const sortRules = (x: Chat, y: Chat) => y.score - x.score;
        let chats = this.queryChats(chat => {
            const chatGid = chat.gid.toLowerCase();
            const {isOne2One} = chat;

            // 启用网络搜索时排除本地一对一对话，一对一会话采用服务器搜索
            if (searchFromRemote && isOne2One && !chat.isPrivate) {
                return;
            }

            if (hasChatType && ((isContactsType && !isOne2One) || (isGroupsType && !chat.isGroupOrSystem))) {
                return;
            }

            const {theOtherMemberID} = chat;

            // Filter exclude Member.
            if (excludeMemberIdList && isOne2One && excludeMemberIdList.has(theOtherMemberID)) {
                return;
            }

            // Do not show delete one2one chat and dismissed group chats in search result
            if (chat.isDeleted || chat.isDismissed) {
                return;
            }

            // Exclude readonly chats
            if (!includeReadonly && chat.isReadonly(currentUser)) {
                return;
            }

            const chatName = chat.name.toLowerCase();
            const pinYin = getChatPinYinName(chat);
            let theOtherOneAccount = '';
            let theOtherOneContactInfo = '';
            if (isOne2One) {
                const theOtherOne = membersStore.getMember(theOtherMemberID);
                if (theOtherOne) {
                    theOtherOneAccount = theOtherOne.account;
                    theOtherOneContactInfo += (theOtherOne.email || '') + (theOtherOne.mobile || '');
                } else if (DEBUG) {
                    console.warn('Cannot get the other one of chat', chat);
                }
            }
            let score = 0;
            searchKeys.forEach(s => {
                if (isEmptyString(s)) {
                    return;
                }
                if (s.length > 1) {
                    if (s[0] === '#') { // id
                        s = s.substring(1);
                        score += 2 * caculateScore(s, chatGid);
                        if (chat.isSystem || chat.isGroup) {
                            score += 2 * caculateScore(s, chatName);
                            if (chat.isSystem) {
                                score += 2 * caculateScore(s, 'system');
                            }
                        }
                    } else if (s[0] === '@') { // account or username
                        s = s.substring(1);
                        if (isOne2One) {
                            score += 2 * caculateScore(s, theOtherOneAccount);
                        }
                    }
                }
                score += caculateScore(s, chatName);
                score += caculateScore(s, pinYin);
                if (theOtherOneContactInfo) {
                    score += caculateScore(s, theOtherOneContactInfo);
                }
            });
            chat.score = score;
            return score > 0;
        }, {sortRules: searchFromRemote ? false : sortRules});

        if (searchFromRemote) {
            const remoteChats = await searchChatsFromRemote(
                searchKeys,
                excludeMemberIdList
                    ? new Set([...excludeMemberIdList])
                    : new Set()
            );
            chats = sortChats(chats.concat(remoteChats), sortRules);
        }
        return chats;
    }

    /**
     * 搜索讨论组
     * @param searchKey 搜索关键字，多个关键字使用空格分隔
     * @param options 选项
     * @param options.includeReadonly 是否包含只读的会话
     * @param options.excludeSystemChats 是否剔除系统会话
     * @returns 会话对象数组
     */
    searchGroupChats(searchKey: string, options: Partial<{includeReadonly: boolean; excludeSystemChats: boolean;}> = {}) {
        if (isEmptyString(searchKey)) {
            return [];
        }
        const searchKeys = searchKey.trim().toLowerCase().split(' ');
        if (!searchKeys.length) {
            return [];
        }

        const {includeReadonly = true, excludeSystemChats = true} = options;
        const currentUser = getCurrentUser();
        const sortRules = (x: Chat, y: Chat) => y.score - x.score;
        const chats = this.queryChats(chat => {
            // Exclude one2one chats
            if (chat.isOne2One) {
                return;
            }

            // Exclude system chats
            if (excludeSystemChats && chat.isSystem) {
                return;
            }

            // Do not show delete chats and dismissed group chats in a search result
            if (chat.isDeleted || chat.isDismissed) {
                return;
            }

            // Exclude readonly chats
            if (!includeReadonly && chat.isReadonly(currentUser)) {
                return;
            }

            const chatName = chat.name.toLowerCase();
            const chatGid = chat.gid.toLowerCase();
            const pinYin = getChatPinYinName(chat);
            let score = 0;
            searchKeys.forEach(s => {
                if (isEmptyString(s)) {
                    return;
                }
                if (s.length > 1) {
                    if (s[0] === '#') { // id
                        s = s.substring(1);
                        score += 2 * caculateScore(s, chatGid);
                        score += 2 * caculateScore(s, chatName);
                        if (chat.isSystem) {
                            score += 2 * caculateScore(s, 'system');
                        }
                    }
                }
                score += caculateScore(s, chatName);
                score += caculateScore(s, pinYin);
            });
            chat.score = score;
            return score > 0;
        }, {sortRules});

        return chats;
    }

    /**
     * 移除会话数据
     * @param gid 会话 GID
     * @returns 如果为 true 表示移除成功
     */
    removeChat(gid: string) {
        const chat = this.getChat(gid, false);
        if (chat) {
            chat.isDeleted = true;
            this.store(chat);
            return true;
        }
        return false;
    }

    /**
    * 获取系统类型会话
    * @param limit 返回结果最多数目，如果为 0 则不限制
    * @returns 系统类型会话列表
    */
    getSystemChats(limit = 0) {
        return this.queryChats(chat => chat.isSystem, {limit});
    }

    /**
     * 获取私人的会话
     * @param options 查询选项
     * @param options.sortRules 是否对结果进行排序，如果为 false 则不进行排序，默认为 recentFirst
     * @param options.excludeLocal 是否排出本地会话，默认为 false
     * @returns 私人的会话列表
     */
    getPrivateChats(options: Partial<{sortRules: SortChatsOrder, excludeLocal: boolean;}> = {}) {
        const {sortRules = 'recentFirst', excludeLocal = false} = options;
        return this.queryChats(chat => chat.isOne2One, {sortRules, excludeLocal});
    }

    /**
     * 获取最近激活的会话
     * @param options 选项
     * @param options.includeStar 是否包含收藏的会话
     * @param options.sortList 是否排序或者指定排序规则
     * @param options.excludeSystemChats 是否排除系统会话
     * @param options.includeReadonly 是否包含只读的会话
     * @param options.maxRecentTime 默认标记为最近会话最大过去时间，单位毫秒，如果为 0 则不受限，默认为 MAX_RECENT_TIME（7 天）
     * @returns 最近激活的会话列表
     */
    getRecentChats(options: Partial<{
        includeStar: boolean;
        sortList: SortChatsOrder;
        excludeSystemChats: boolean;
        includeReadonly: boolean;
        maxRecentTime: number;
    }> = {}) {
        const {
            includeStar = true,
            sortList = 'recentFirst',
            excludeSystemChats = false,
            includeReadonly = true,
            maxRecentTime = MAX_RECENT_TIME,
        } = options;

        const now = Date.now();
        const currentUser = getCurrentUser();
        const recents = this.queryChats(chat => (
            (!excludeSystemChats || !chat.isSystem)
            && (chat.unreadMessagesCount || !chat.hidden)
            && !chat.isDeleted
            && !chat.isDismissed
            && !chat.frozen
            && (
                chat.unreadMessagesCount
                || chat.draft
                || (includeStar && chat.star)
                || ((!maxRecentTime || (chat.lastActiveTime && (now - chat.lastActiveTime) <= maxRecentTime)) && (chat.lastMessageIndex || chat.isPrivate))
            )
            && (includeReadonly || !chat.isReadonly(currentUser))
        ), {sortRules: sortList});

        // 如果没有排除系统会话，并且最近会话列表为空，则直接返回系统会话
        if (!excludeSystemChats && !recents.length) {
            return this.getSystemChats();
        }
        return recents;
    }

    /**
     * 获取最近一个未读的会话
     * @returns 会话对象
     */
    getLastChatWithUnreadMessages() {
        return this.queryChats(x => x.unreadMessagesCount > 0, {sortRules: 'lastMessageId', limit: 1})[0];
    }

    /**
     * 获取讨论组会话
     * @param sortList 是否对结果进行排序，如果为 false 则不进行排序
     * @param createdByMe 是否由我创建
     * @param includeReadonly 是否包含只读的会话
     * @returns 讨论组对象列表或分组对象
     */
    getGroupsChats(sortList: SortChatsOrder = 'recentFirst', createdByMe = false, includeReadonly = true) {
        const user = getCurrentUser();
        if (!user) {
            return [];
        }
        const {account} = user;
        const now = Date.now();
        const dismissedGroupLife = getCurrentUser()?.dismissedGroupLife;
        return this.queryChats(chat => (
            chat.isGroupOrSystem
            && (!createdByMe || chat.createdBy === account)
            && (includeReadonly || !chat.isReadonly(user))
            && (!chat.isDismissed || chat.dismissDate + dismissedGroupLife * TIME_DAY > now)
        ), {sortRules: sortList, excludeLocal: true});
    }

    /**
     * 获取最近联系的成员列表
     * @param limit 最多返回数目
     * @returns 成员列表
     */
    getRecentContactMembers(limit = 20) {
        const contactsPrimaryMap = new Map<number, {chat: Chat; contact: Member;}>();
        const contactsSecondaryMap = new Map();
        const contactsSort = (contacts: typeof contactsPrimaryMap, sortLimit: number) => {
            if (!contacts.size) {
                return [];
            }
            const contactsList = Array.from(contacts.values()).sort((x, y) => {
                let result = x.chat.lastMessageIndex < y.chat.lastMessageIndex ? 1 : (x.chat.lastMessageIndex === y.chat.lastMessageIndex ? 0 : -1);
                if (result === 0) {
                    result = x.contact.lastAccessTime < y.contact.lastAccessTime ? 1 : (x.contact.lastAccessTime === y.contact.lastAccessTime ? 0 : -1);
                }
                if (result === 0) {
                    result = x.contact.id - y.contact.id;
                }
                return result;
            }).map(cm => cm.contact);
            return contactsList.length > sortLimit ? contactsList.slice(0, sortLimit) : contactsList;
        };
        this.forEach(chat => {
            if (chat.isOne2One && chat.lastMessageIndex && chat.id) {
                const contact = membersStore.getItemFromCache(chat.theOtherMemberID);
                if (contact && !contact.isDeleted) {
                    contactsPrimaryMap.set(contact.id, {chat, contact});
                }
            }
        });

        const contactsPrimaryArr = contactsSort(contactsPrimaryMap, Math.min(contactsPrimaryMap.size, limit));
        if (contactsPrimaryArr.length === limit) {
            return contactsPrimaryArr;
        }

        if (contactsPrimaryArr.length < limit) {
            const now = Date.now();
            membersStore.forEach(contact => {
                if (contact.id === getCurrentUserID()) {
                    return;
                }
                if (
                    contact.lastAccessTime
                    && !contactsPrimaryMap.has(contact.id)
                    && !contactsSecondaryMap.has(contact.id)
                    && (now - contact.lastAccessTime) <= MAX_RECENT_TIME
                ) {
                    contactsSecondaryMap.set(contact.id, {chat: {}, contact});
                }
            });
        }
        const contactsSecondaryArr = contactsSort(contactsSecondaryMap, Math.min(contactsSecondaryMap.size, limit));
        const result = contactsPrimaryArr.concat(contactsSecondaryArr);
        return result.length > limit ? result.slice(0, limit) : result;
    }

    /**
     * 异步获取未加入的 指定 GID 的公开会话
     * @param gid 会话 GID
     * @returns 使用 Promise 异步返回公开会话对象
     */
    async fetchPublicChat(gid: string) {
        const chats = await this.fetchPublicChats();
        return chats.find(x => x.gid === gid);
    }

    /**
     * 从服务器获取未加入的公开会话数据
     * @returns 使用 Promise 异步返回处理结果
     */
    fetchPublicChats() {
        return this._idleTasks.requestAndWait<Chat[]>(async () => {
            const chats = await socket.sendAndListen('chatGetPublicList');
            if (chats?.length) {
                return chats.map(createChat);
            }
            return [];
        }, {name: 'fetchPublicChats', timeout: 1000});
    }
}

/**
 * 会话数据存储中心
 */
const chatsStore = new ChatsStore();

// 监听数据库初始化完成事件
setCallbackOnInitedDB(chatsStore.reset.bind(chatsStore));

// 当用户退出时保存未保存的数据
onUserLogout(() => {
    chatsStore.saveChatsToDatabase();
});

// 注册更新公开会话列表命令
registerCommand('fetchPublicChats', () => chatsStore.fetchPublicChats());

if (DEBUG) {
    global.$chatsStore = chatsStore;
}

export default chatsStore;
