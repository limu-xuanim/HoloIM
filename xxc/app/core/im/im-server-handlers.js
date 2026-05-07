import {OBJECT_TYPES} from '~/app/core/im/chat-message';
import {VersionSupport} from '~/app/core/server/feature-versions';
import events from '../events';
import Chat from './chat';
import {getCurrentUserID, getCurrentUser} from '../profile';
import Config from '../../config';
import {updateChatTyping} from './im-chat-typing';
import chatsStore from './chats-store';
import messagesStore from './chat-messages-store';
import deptsStore from '../members/depts-store';
import {showAlert} from '../../components/modal';
import {executeCommand} from '../commander';
import chatMessagesStore from './chat-messages-store';
import jotaiStore from '~/app/jotai/stores/default';

/**
 * 事件表
 */
const EVENT = {
    dismissedChat: 'im.chats.dismissedChat',
};

/**
 * 讨论组管理事件表
 */
export const GroupManagementEvent = {
    rename: 'group.management.rename',
    chatMemberChange: 'group.management.chatMemberChange',
    setAdmin: 'group.management.setAdmin',
    groupMerge: 'group.management.groupMerge',
};

/**
 * 处理服务器推送修改聊天名称消息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {Chat} 如果处理成功则返回修改名称后的聊天实例
 * @private
 */
const chatRename = (msg, socket) => {
    if (msg.isSuccess) {
        events.emit(GroupManagementEvent.rename);
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.name = msg.data.name;
            chatsStore.store(chat);
            return chat;
        }
    } else {
        executeCommand('showMessager', msg.message, {type: 'info'});
    }
};

/**
 * 处理服务器推送修改聊天白名单信息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {Chat} 如果处理成功则返回修改后的聊天实例
 * @private
 */
const chatSetCommitters = (msg, socket) => {
    if (msg.isSuccess) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.setCommitters(msg.data.committers);
            return chatsStore.store(chat);
        }
    }
};

/**
 * 处理服务器推送修改群设置信息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {Chat} 如果处理成功则返回修改后的聊天实例
 * @private
 */
const chatSetConfig = (msg, socket) => {
    if (msg.isSuccess) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.setCommitters(msg.data.committers);
            chat.public = msg.data.public;
            chat.adminInvite = msg.data.adminInvite;
            return chatsStore.store(chat);
        }
    }
};
/**
 * 处理服务器推送修改聊天添加成员消息
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {Chat} 如果处理成功则返回修改后的聊天实例
 * @private
 */
const chatSetMembers = (msg) => {
    if (!msg.isSuccess) {
        return;
    }
    events.emit(GroupManagementEvent.chatMemberChange);
    let chat = chatsStore.getChat(msg.data.gid);
    if (!chat) {
        chat = chatsStore.normalizeItem(msg.data);

        // 新加入会话，设置所有已有消息为已读
        chat.setLastReadMessageIndex(chat.lastMessageIndex);
    } else {
        chat.isDeleted = false;
        chat.setMembers(msg.data.members);
    }
    if (chat.isMember(getCurrentUserID())) {
        chatsStore.store(chat);
        return chat;
    }
    chatsStore.removeChat(chat.gid);
    return chat;
};

/**
 * 处理服务器推送创建聊天消息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {Chat} 如果处理成功则返回创建的聊天实例
 */
const chatCreateHandler = (msg, socket) => {
    if (!msg.isSuccess) {
        return;
    }
    const oldChat = chatsStore.getChat(msg.data.gid);
    if (oldChat) {
        msg.data = {
            ...msg.data,
            ...{
                mute: oldChat.mute,
                star: oldChat.star,
                latestMessageIndexes: oldChat.latestMessageIndexes,
                lastReadMessageIndex: oldChat.lastReadMessageIndex,
            },
        };
    }
    const chat = new Chat(msg.data);
    chatsStore.store(chat);
    return chat;
};

/**
 * 处理服务器推送创建聊天消息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {Chat} 如果处理成功则返回创建的聊天实例
 * @private
 */
const chatGetMembers = (msg) => {
    if (msg.isSuccess && msg.data && msg.data.gid && msg.data.members) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.setMembers(msg.data.members);
            chatsStore.store(chat);
        }
        return chat;
    }
};

/**
 * 处理服务器推送接收到的聊天消息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {boolean} 处理结果
 * @private
 */
const messageSend = (msg, socket) => {
    if (msg.isSuccess) {
        let messages = msg.data;
        if (!Array.isArray(messages)) {
            messages = messages.cgid && messages.content
                ? [messages]
                : Object.keys(messages).map(x => messages[x]);
        }
        if (messages?.length) {
            messagesStore.store(messages, {putToDatabase: true, putToCache: true, unread: true});
            return true;
        }
    }
};

/**
 * 处理服务器推送收藏聊天消息
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {Chat} 如果处理成功则返回修改后的聊天实例
 * @private
 */
const chatStar = (msg) => {
    if (msg.isSuccess) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.star = msg.data.star;
            chatsStore.store(chat);
            return chat;
        }
    }
};

/**
 * 处理服务器推送设置消息免打扰设置消息
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {Chat} 如果处理成功则返回修改后的聊天实例
 * @private
 */
const chatMute = (msg) => {
    if (msg.isSuccess) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.mute = msg.data.mute;
            chatsStore.store(chat);
            return chat;
        }
    }
};

/**
 * 处理服务器推送设置消息隐藏操作结果
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {Chat} 如果处理成功则返回修改后的聊天实例
 * @private
 */
const chatHide = (msg, socket) => {
    if (msg.isSuccess) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.hide = msg.data.hide;
            chatsStore.store(chat);
            return chat;
        }
    }
};

/**
 * 处理服务器推送设置消息隐藏操作结果
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {Chat} 如果处理成功则返回修改后的聊天实例
 * @private
 */
const chatFreeze = (msg) => {
    if (msg.isSuccess) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.frozen = msg.data.freeze;
            chatsStore.store(chat);
            return chat;
        }
    }
};

/**
 * 处理服务器推送解散聊天操作结果
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {Chat} 如果处理成功则返回修改后的聊天实例
 * @private
 */
const chatDismiss = (msg) => {
    if (msg.isSuccess) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.dismissDate = msg.data.dismissDate;
            chatsStore.store(chat);
            events.emit(EVENT.dismissedChat, chat.gid);
            return chat;
        }
    }
};

/**
 * 处理服务器推送设置聊天是否公开操作结果
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {Chat} 如果处理成功则返回修改后的聊天实例
 * @private
 */
const chatSetVisibility = (msg) => {
    if (msg.isSuccess) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (chat) {
            chat.public = msg.data.public;
            chatsStore.store(chat);
            return chat;
        }
    }
};

/**
 * 处理服务器推送通知消息操作
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {boolean} 返回操作结果
 * @private
 */
const syncNotifications = (msg) => {
    if (msg.isSuccess) {
        const messages = msg.data;
        if (messages?.length) {
            messagesStore.store(messages, {putToCache: true, putToDatabase: true, unread: true});
        }
        return true;
    }
};

const syncDepts = (msg) => {
    if (msg.isSuccess) {
        const {data} = msg;
        if (data) {
            deptsStore.updateDeptsData(data);
        }
    }
};

/**
 * 处理聊天用户状态变更事件
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {boolean} 返回操作结果
 * @private
 */
const chatTyping = (msg) => {
    if (msg.isSuccess) {
        const {data} = msg;
        if (data) {
            updateChatTyping(data.cgid, data.typing, data.user);
        }
    }
};

/**
 * 处理群组聊天置顶消息事件
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {boolean} 返回操作结果
 * @private
 */
const chatPinMessages = (msg) => {
    if (msg.isSuccess) {
        const resData = msg.data;
        const chat = chatsStore.getChat(resData.cgid);
        if (chat) {
            chat.pinnedMessages = resData.allPinned;
        }
        if (resData.pinned) {
            const messages = messagesStore.getMessages(resData.pinned, resData.cgid);
            messagesStore.store(messages);
        }
        chatsStore.store(chat);
        return;
    }
    showAlert(msg.message);
};

/**
 * 处理群组聊天取消置顶消息事件
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {boolean} 返回操作结果
 * @private
 */
const chatUnpinMessages = (msg) => {
    if (msg.isSuccess) {
        const resData = msg.data;
        const chat = chatsStore.getChat(resData.cgid);
        if (chat) {
            chat.pinnedMessages = resData.allPinned;
        }
        if (resData.unpinned) {
            const messages = messagesStore.getMessages(resData.unpinned, resData.cgid);
            messagesStore.store(messages);
        }
        chatsStore.store(chat);
    }
};

/**
 * 处理标记最后一个已读消息事件(index)
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {void}
 * @private
 */
const chatSetLastReadMessageByIndex = msg => {
    if (msg.isSuccess) {
        const chat = chatsStore.getChat(msg.data.gid);
        if (!chat) {
            return;
        }

        const user = getCurrentUser();
        if (!user) {
            return;
        }

        if (msg.userID === user.id) {
            chat.setLastReadMessageIndex(msg.data.id);
        }

        chatsStore.store(chat);
    }
};

// 处理服务器推送会话列表消息
const chatGetList = (msg) => {
    if (!msg.isSuccess) {
        return false;
    }
    chatsStore.storeChatsFromRemote(msg.data);
    const lastMessages = msg.data.map(chat => chat.lastMessageInfo).filter(x => !!x);
    messagesStore.store(lastMessages, {skipChatFilter: true});
    return true;
};

/**
 * Socket 服务器推送消息处理函数
 */
export const imServerHandlers = {
    chatRename,
    chatSetCommitters,
    chatSetConfig,
    chatInvite: chatSetMembers,
    chatKick: chatSetMembers,
    chatLeave: chatSetMembers,
    chatJoin: chatSetMembers,
    chatCreate: chatCreateHandler,
    chatGetMembers,
    messageSend,
    messageRetract: messageSend,
    messageUpdate: messageSend,
    chatStar,
    chatMute,
    chatHide,
    chatFreeze,
    chatDismiss,
    chatSetVisibility,
    syncNotifications,
    syncDepts,
    chatTyping,
    chatPinMessages,
    chatUnpinMessages,
    chatSetLastReadMessageByIndex,
    chatGetList,
};
