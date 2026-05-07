import {Subject} from 'rxjs';

/** 收到新消息 Subject */
const receiveNewSubject = new Subject<number[]>();

/** 未读消息变更事件名 */
const unreadChangeSubject = new Subject<number>();

/**
 * 订阅接收到新消息事件
 * @param listener 事件回调函数，第一个参数为新消息 ID 列表
 * @returns Subscription
 */
export function subscribeReceiveNewMessages(listener: (messages: number[]) => void) {
    return receiveNewSubject.subscribe(listener);
}

/**
 * 发布收到新消息事件
 * @param newMessages 新消息列表
 */
export function emitReceiveNewMessages(newMessages: number[]) {
    receiveNewSubject.next(newMessages);
}

/**
 * 上次发布未读消息数变更事件时的未读消息数目
 */
let lastUnreadMessageCount = 0;

/**
 * 订阅会话未读消息变更事件
 * @param listener 事件回调函数，第一个参数为会话未读消息数目
 * @returns Subscription
 */
export function subscribeUnreadMessagesChange(listener: (count: number) => void) {
    return unreadChangeSubject.subscribe(listener);
}

/**
 * 发布收到未读消息数变更事件
 * @param count 未读消息数
 */
export function emitUnreadMessagesChange(count: number) {
    unreadChangeSubject.next(count);
    lastUnreadMessageCount = count;
}

/**
 * 尝试发布收到未读消息数变更事件
 * @param count 未读消息数
 */
export function tryEmitUnreadMessagesChange(count: number) {
    if (count !== lastUnreadMessageCount) {
        emitUnreadMessagesChange(count);
        if (DEBUG) {
            console.warn('TryEmitUnreadMessagesChange works.');
        }
    }
}
