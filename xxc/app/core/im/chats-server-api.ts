import socket from '../server/socket';
import events from '../events';
import {getCurrentUser} from '../profile';

/**
 * 事件名称表
 */
enum EVENT {
    message_send = 'im.server.message.send',
    message_receive = 'im.server.message.receive',
    chat_action_changed = 'im.server.chat.action'
}

/**
 * 请求服务器创建一个新的会话
 * @param chat 要创建的会话对象
 * @returns 使用 Promise 异步返回处理结果
 */
export const createChat = (chat: Chat|{gid: string; name: string; type: string; members: number[]; public: boolean;}): Promise<any> => socket.sendAndListen({
    method: 'chatCreate',
    params: [
        chat.gid,
        chat.name || '',
        chat.type,
        Array.from(chat.members),
        0,
        chat.public ? chat.public : false
    ]
});

/**
 * 将会话从最近会话列表移除（freeze）
 * @param chat 会话实例
 * @param frozen 是否移除，如果省略此参数则切换之前的状态
 * @returns 使用 Promise 异步返回处理结果
 */
export async function toggleFreezeChat(chat: Chat, frozen?: boolean): Promise<boolean> {
    if (!chat.id) {
        await createChat(chat);
    }
    const theChat = await socket.sendAndListen({
        method: 'chatFreeze',
        params: [typeof frozen === 'boolean' ? frozen : !chat.frozen, chat.gid]
    });
    if (theChat) {
        events.emit(EVENT.chat_action_changed, theChat, 'freeze', chat.frozen);
        return true;
    }
    return false;
}

/**
 * 与服务器同步给定会话的最后阅读的消息 ID
 * @param chat 会话实例
 * @param lastReadMessageIndex 最后阅读的消息 ID
 * @returns 使用 Promise 异步返回处理结果
 */
export async function syncLastReadMessageForChat(chat: Chat, lastReadMessageIndex = chat.lastReadMessageIndex): Promise<boolean> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return false;
    }

    if (!chat.id) {
        return false;
    }

    await socket.sendAndListen({
        method: 'chatSetLastReadMessageByIndex',
        params: [chat.gid, lastReadMessageIndex]
    });
    return true;
}

/**
 * 主动拉取通知消息
 */
export function getNotification() {
    return socket.send({
        method: 'getNotification',
        params: []
    });
}
