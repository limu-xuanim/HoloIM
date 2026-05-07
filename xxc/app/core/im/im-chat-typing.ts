import socket from '../server/socket';
import {getCurrentUser, onSwapUser} from '../profile';
import {isOne2OneChatOnline} from './chat-helper';
import {Subject} from 'rxjs';

/** 至少间隔多长时间向服务器更新状态，单位毫秒 */
export const msgSendInterval = 3000;

/**
 * 存储聊天输入框状态
 * 会话 GID, 上次发送时间戳
 */
const lastTypingTimes = new Map<string, number>();

/** 记录当前是否在发送状态数据包 */
let isSendingTyping = false;

/** 存储会话输入状态计时器 */
const chatTypingTimer = new Map<string, number>();

export const chatTypingSubject = new Subject<[string, boolean]>();

export const subscribeChatTyping = (cgid: string, listener: (typing: boolean) => void) => {
    return chatTypingSubject.subscribe(([_cgid, typing]) => {
        if (cgid !== _cgid) {
            return;
        }
        listener(typing);
    });
};

/**
 * 通知界面聊天输入状态变更
 * @param cgid 聊天的 GID 属性
 * @param typing 如果为 `true` 表示用户正在输入，如果为 `false` 表示用户停止输入
 * @param typeUserID 表示输入状态变更的用户 ID
 */
export const updateChatTyping = (cgid: string, typing: boolean, _typeUserID: number): void => {
    chatTypingSubject.next([cgid, typing]);
    if (chatTypingTimer.has(cgid)) {
        clearTimeout(chatTypingTimer.get(cgid));
    }
    if (typing) {
        chatTypingTimer.set(cgid, window.setTimeout(() => {
            chatTypingSubject.next([cgid, false]);
            chatTypingTimer.delete(cgid);
        }, msgSendInterval));
    }
};

/**
 * 向服务器发送当前用户输入状态变更信息
 * @param chat 当前聊天对象
 * @param typing 如果为 `true` 表示用户正在输入，如果为 `false` 表示用户停止输入
 */
const sendChatTyping = async (chat: Chat, typing: boolean) => {
    if (!getCurrentUser()?.isOnline || chat.isPrivate) {
        return;
    }

    isSendingTyping = true;

    let msg;
    try {
        msg = await socket.send({
            method: 'chattyping',
            requestData: {
                cgid: chat.gid,
                users: chat.theOtherMemberID,
                typing
            }
        });

    } catch {}

    isSendingTyping = false;
    return msg;
};

/**
 * 更新聊天输入框输入状态
 * @param chat 当前聊天对象
 * @param hasContent 当前聊天输入框是否有内容
 */
export const updateChatSendboxStatus = (chat: Chat, hasContent: boolean) => {
    // 如果聊天对方不在线，则不发送输入状态
    if (!isOne2OneChatOnline(chat)) {
        return;
    }

    // 如果上一个输入状态还没发出去，则取消此次状态更新
    if (isSendingTyping) {
        return;
    }

    // 如果用户没有登录或者版本不支持或者用户禁用了这个功能，则不发送输入状态
    const user = getCurrentUser();
    if (!user || !user.config.sendTypingStatus) {
        return;
    }

    // 获取上次发送状态时的时间
    const {gid} = chat;
    const typingTime = lastTypingTimes.get(gid);
    const now = Date.now();

    // 如果还没更新过状态，或者上次更新状态是 3 秒之前
    if ((!typingTime && hasContent) || (now - typingTime) >= msgSendInterval) {
        sendChatTyping(chat, true);
        lastTypingTimes.set(gid, now);
    }
};

onSwapUser(() => lastTypingTimes.clear());
