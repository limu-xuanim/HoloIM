import {emitMemberLogout} from '../members';
import membersStore from '../members/members-store';
import chatsStore from '../im/chats-store';
import Lang from '../lang';
import {STATUS} from '../members/member';
import events from '../events';
import {emitUserLoginOnOtherDeviceEvent, getCurrentUserID} from '../profile';

/**
 * 事件表
 */
const EVENT = {
    showMessage: 'ui.showMessage',
};

/**
 * 处理服务器用户登录推送消息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const userLogin = (msg, socket) => {
    const {user} = socket;
    if (msg.isSuccess) {
        // 首先通过 rid 判断是否为本客户端的登录请求，此时 user.id 可能为空
        if (msg.rid === socket.loginRid) {
            user.$set(msg.data);
            if (msg.data.status) {
                user.status = msg.data.status;
            }
            return true;
        }
        if (msg.data.id === user.id) {
            emitUserLoginOnOtherDeviceEvent(msg.device);
            return true;
        }
        const member = membersStore.getMember(msg.data.id);
        if (member) {
            member.$set(msg.data);
            member.status = msg.data.status;
            membersStore.store(member);
        } else {
            membersStore.store(msg.data);
        }
    } else if ((user.isLogging || msg.data.id === user.id) && msg.message) {
        user.loginError = new Error(msg.message);
    }
    return false;
};

/**
 * 处理服务器用户退出登录推送消息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const userLogout = (msg, socket) => {
    if (msg.isSuccess) {
        const {user} = socket;
        if (msg.data.id === user.id && socket.isConnected) { // TODO: 此处 socket.isConnected 需要验证
            user.markUnverified();
            socket.close();
        } else {
            const member = membersStore.getMember(msg.data.id);
            if (member) {
                member.status = STATUS.$.unverified;
                membersStore.store(member);
                emitMemberLogout(member);
            }
        }
    }
};

/**
 * 处理服务器提示错误推送消息
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const sysError = (msg) => {
    const message = Lang.error(msg);
    if (message) {
        events.emit(EVENT.showMessage, message);
    }
};

/**
 * 处理服务器返回用户个人配置推送消息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const userSyncSettings = (msg, socket) => {
    if (msg.isSuccess) {
        const {user} = socket;
        const {config} = user;
        const {data} = msg;
        if (!data || config.hash === data.hash) {
            return;
        }
        if (data.reset) {
            config.reset({});
        } else if (data.lastChangeTime && data.lastChangeTime > config.lastChangeTime) {
            config.reset(data);
        } else {
            config.set(data, null, true);
        }
    }
};

/**
 * 处理服务器用户信息变更推送消息
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const userUpdate = (msg, socket) => {
    if (msg.isSuccess && msg.data) {
        const {user} = socket;
        if (!msg.data.id || msg.data.id === user.id) {
            user.$set(msg.data);
            if (msg.data.status) {
                user.status = msg.data.status;
            }
        }

        if (msg.data.id) {
            const member = membersStore.getMember(msg.data.id);
            if (member) {
                member.$set(msg.data);
                if (msg.data.status) {
                    member.status = msg.data.status;
                }
                membersStore.store(member);
                const userID = getCurrentUserID();
                if (userID === member.id) {
                    const privateChat = chatsStore.getChat(`${userID}&${userID}`);
                    if (privateChat.name !== member.displayName) {
                        privateChat.name = member.displayName;
                        chatsStore.store(privateChat);
                    }
                }

                return member;
            }
        }
    }
};

/**
 * 处理服务器当前用户被踢出推送消息（通常因为用户在其他地方登录）
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const userKickoff = (msg, socket) => {
    const {reason} = msg;
    socket.close(null, reason ? `USER_KICKOFF_${reason}` : 'USER_KICKOFF');
};

/**
 * 处理服务器推送系统用户列表消息
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const userGetList = (msg) => {
    if (msg.isSuccess) {
        return membersStore.store(msg.data);
    }
};

/**
 * 处理从服务器获取的临时用户列表消息
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const userGetDeleted = (msg) => {
    if (msg.isSuccess) {
        membersStore.store(msg.data);
    }
};

/**
 * 处理从服务器获取的用户搜索结果消息
 * @param {SocketMessage} msg Socket 消息对象
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const userSearch = msg => {
    if (msg.isSuccess) {
        return {data: msg.data, pager: msg.pager};
    }
};

/**
 * 处理服务器推送当前用户 SessionID 消息
 * SessionID 用于发起 http 请求时免登录
 * @param {SocketMessage} msg Socket 消息对象
 * @param {Socket} socket Socket 连接实例
 * @returns {any} 如果返回 `false`，表示此消息处理失败或者无法处理，如果为 `true` 或其他数据则表示已经处理
 * @private
 */
const sysSessionID = (msg, socket) => {
    if (msg.isSuccess || msg.sessionID) {
        const {user} = socket;
        user.sessionID = msg.data || msg.sessionID;
    }
};

/**
 * 处理服务器返回的 pong 消息
 * @returns {void}
 * @private
 */
const ping = () => {};

/**
 * Socket 服务器推送消息处理函数
 */
export default {
    userLogin,
    userLogout,
    sysError,
    userSyncSettings,
    userUpdate,
    userKickoff,
    userGetList,
    userGetDeleted,
    userSearch,
    sysSessionID,
    ping,
};
