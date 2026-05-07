import events from '../events';

/**
 * 事件名称表
 */
enum EVENT {
    logout = 'member.logout',
}

/**
 * 绑定成员登出事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onMemberLogout = (listener: (member: Member) => void): symbol => events.on(EVENT.logout, listener);

/**
 * 触发成员登出事件
 * @param member 登出的成员
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const emitMemberLogout = (member: Member) => events.emit(EVENT.logout, member);
