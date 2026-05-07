/* eslint-disable class-methods-use-this */
import Config from '../../config';
import ChatMessage, {TYPES} from './chat-message';

/**
 * 通知消息类
 *
 * @export
 * @class NotificationMessage
 * @extends {ChatMessage}
 */
export class NotificationMessage extends ChatMessage {
    /**
     * 获取消息发送者
     *
     * @type {Member}
     * @readonly
     */
    get sender() {
        if (!this._sender) {
            const {notification} = this;
            let {sender} = notification;
            if (!sender.system && (sender.id === 'ranzhi' || sender.id === 'zdoo')) {
                sender = {
                    id: 'ranzhi',
                    realname: '然之协同',
                    system: true,
                    avatar: `${Config.media['image.path']}ranzhi-icon.png`
                };
            } else if (sender.name && !sender.realname) {
                sender.realname = sender.name;
            }
            if (typeof sender === 'number') {
                sender = {
                    id: `${sender}`,
                    realname: `${sender}`,
                    system: false
                };
            }
            if (!sender.displayName) {
                sender.displayName = sender.realname || sender.name || sender.id;
            }
            if (!sender.id) {
                sender.id = '';
            } else if (typeof sender.id !== 'string') {
                sender.id = `${sender.id}`;
            }
            this._sender = sender;
        }
        return this._sender;
    }

    /**
     * 获取发送者名称
     * @type {string}
     */
    get senderName() {
        const {sender} = this;
        return sender ? sender.displayName : this.senderId;
    }

    /**
     * 获取消息发送者 ID
     * @type {string}
     */
    get senderId() {
        return this.notification.sender.id || 'robot1';
    }

    /**
     * 获取是否为通知类消息，此类实例永远返回 `true`
     * @type {boolean}
     */
    get isNotification() {
        return true;
    }

    /**
     * 获取通知操作
     * @type {Object[]}
     */
    get actions() {
        const {notification} = this;
        let {actions} = notification;
        if (actions && !Array.isArray(actions)) {
            actions = [actions];
        }
        return actions;
    }

    /**
     * 获取通知数据对象
     * @type {Object<string, any>}
     */
    get notification() {
        return this.data;
    }

    /**
     * 获取通知发送者，相当于调用 `sender` 属性
     * @returns {Member} 发送人成员实例
     */
    getSender() {
        return this.sender;
    }

    /**
     * 获取是否需要检查重新发送，因为通知消息只能是服务器推送的，所以此属性永远返回 `false`
     * @type {boolean}
     */
    get isInLocal() {
        return false;
    }

    /**
     * 获取是否发送失败，因为通知消息只能是服务器推送的，所以此属性永远返回 `true`
     * @type {boolean}
     */
    get isSendFailed() {
        return false;
    }

    /**
     * 获取通知标题
     */
    get title(): string {
        return this.notification.title;
    }

    /**
     * 获取消息的描述文本
     *
     * @readonly
     * @type {string}
     */
    get summaryText() {
        return `${this.sender.displayName}: ${this.title || this.content}`;
    }

    /**
     * 获取通知副标题
     *
     * @type {string}
     * @readonly
     */
    get subtitle() {
        return this.notification.subtitle;
    }

    static create = createNotificationMessage;
}

/**
 * 创建一个通知消息类实例
 *
 * @static
 * @param {Object<string, any>|NotificationMessage} data 用于创建实例的属性对象
 * @returns {NotificationMessage} 一个通知消息类实例
 */
export function createNotificationMessage(data) {
    if (typeof data.data?.index === 'number') {
        delete data.data.index;
    }
    if (data instanceof NotificationMessage) {
        return data;
    }
    if (data.type === TYPES.notify && data.contentType === 'object' && data.content) {
        data = {
            ...data,
            ...(typeof data.content === 'string' ? JSON.parse(data.content) : data.content),
        };
    }
    if (data.data) {

        data = {...data, ...(typeof data.data === 'string' ? JSON.parse(data.data) : data.data), data: null};
    }
    if (typeof data === 'string') {
        data = JSON.parse(data);
    }

    return new NotificationMessage({
        cgid: data.cgid,
        content: data.content,
        contentType: data.contentType,
        data,
        date: data.date,
        gid: data.gid,
        user: data.sender.id,
        type: TYPES.notify,
        id: data.id,
        index: data.index
    });
}
