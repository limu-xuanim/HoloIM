import {isNotEmptyString} from '../../utils/check-empty';
import {createLocalID, isLocalID} from '../../utils/local-id';
import {createProxyHandler, createProxyPropertiesMap} from '../../utils/proxy-helper';
import Entity from '../db/entity';
import Schema from '../db/schema';
import FileData from '../files/file-data';
import Member from '../members/member';

/**
 * 允许用户发送消息后在此时间内删除消息
 */
export const DELETE_MESSAGE_TIME = 1000 * 60 * 2;

/**
 * 判断会发送失败的等待时间，单位毫秒
 */
export const EXPIRATION_TIME = 1000 * 20;

/**
 * 判定消息 ID 是否为本地生成的
 * @param id 消息 ID
 * @returns 如果返回 `true` 则为是，否则为不是
 */
export const isLocalMessageID = (id: number): boolean => isLocalID(id);

/**
 * 聊天消息类型表
 */
export enum TYPES {
    broadcast = 'broadcast',
    normal = 'normal',
    notify = 'notify', // 通知
}

/**
 * 聊天消息内容类型表
 */
export enum CONTENT_TYPES {
    image = 'image',
    text = 'text',
    plain = 'plain',
    emotion = 'emotion',
    object = 'object',
}

/**
 * 聊天消息对象内容类型表
 */
export enum OBJECT_TYPES {
    default = 'default',
    url = 'url',
}

/**
 * 聊天消息文本内容类型表
 */
export enum TEXT_CONTENT_TYPE {
    notification = 'notification',
    announcement = 'announcement',
}

/**
 * 实体名称
 */
const NAME = 'ChatMessage';

/**
 * 数据库存储实体属性结构管理器
 */
const SCHEMA = new Schema({
    id: {type: 'int', indexed: true, primaryKey: true},
    index: {type: 'int', indexed: true},
    unionId: {type: 'string', indexed: true},
    gid: {type: 'string', indexed: true},
    cgid: {type: 'string', indexed: true},
    user: {type: 'int', indexed: true},
    date: {type: 'timestamp', indexed: true},
    type: {type: 'string', indexed: true, defaultValue: TYPES.normal},
    contentType: {type: 'string', indexed: true, defaultValue: CONTENT_TYPES.plain},
    content: {type: 'string', defaultValue: null},
    keys: {type: 'string', defaultValue: ''},
    deleted: {type: 'boolean'},
    noticeEndTime: {type: 'timestamp'},
    data: {type: 'json'},
    cacheFilePath: {type: 'string'},
    read: {type: 'json'},
});

/**
 * 代理对象属性定义
 */
const PROXY_PROPERTIES = createProxyPropertiesMap(
    [
        'id',
        'index',
        'cgid',
        'user',
        'date',
        'type',
        'contentType',
        'content',
        'deleted',
        'data',
        'imageContent',
        'objectContentType',
        'objectContent',
        'isBroadcast',
    ],
    Entity.PROXY_PROPERTIES,
);

/**
 * 代理对象拦截处理对象
 */
const PROXY_HANDLER = createProxyHandler(PROXY_PROPERTIES);

export type ChatMessageLike = Partial<{
    id: number;
    gid: string;
    contentBackup: string;
    contentType: CONTENT_TYPES;
    type: TYPES;
    date: number;
    index: number;
    cgid: string;
    deleted: boolean;
    data: Record<string, any>;
    reminders: number[] | string | Set<number>;
    user: number;
    noticeEndTime: number;
    content: string;
    cacheFilePath: string;
    keys: string;
    read: number[];
}>;

/**
 * 会话消息类
 */
export default class ChatMessage extends Entity<ChatMessageLike> {
    /**
     * 实体名称
     */
    static override NAME = NAME;

    /**
     * 聊天消息类型表
     */
    static TYPES = TYPES;

    /**
     * 聊天消息内容类型表
     */
    static CONTENT_TYPES = CONTENT_TYPES;

    /**
     * 聊天消息对象内容类型表
     */
    static OBJECT_TYPES = OBJECT_TYPES;

    /**
     * 数据库存储实体属性结构管理器
     */
    static override SCHEMA = SCHEMA;

    /**
     * 代理对象属性定义
     */
    static override PROXY_PROPERTIES = PROXY_PROPERTIES;

    /**
     * 代理对象拦截处理对象}
     */
    static override PROXY_HANDLER = PROXY_HANDLER;

    /**
     * 当前消息的简略文本形式
     */
    summary: string;

    /**
     * 是否发送失败
     */
    #isSendFailed: boolean;

    /**
     * 消息备份
     */
    private contentBackup: string;

    /**
     * 额外数据
     */
    #data: Record<string, any>;

    /**
     * 此消息需要提醒的用户 ID 集合
     */
    private _reminders: Set<number> | null;

    protected _sender: Member;

    private _emotionContent: any;

    private _objectContent: any;

    private _imageContent: any;

    public _renderedTextContent: string;

    public _isBlockContent: boolean;

    user: any;

    attachFile: any;

    public expired: boolean;

    public lastAccessTime: number;

    /**
     * 创建一个聊天消息类实例
     * @param data 聊天消息属性对象
     * @param entityType 实体类型名称
     */
    constructor(data: ChatMessageLike, entityType = NAME) {
        super(data, entityType);

        if (data.contentBackup) {
            this.contentBackup = data.contentBackup;
        }

        if (data.data) {
            if (typeof data.data === 'string') {
                try {
                    data.data = JSON.parse(data.data);
                } catch (e) {
                    if (DEBUG) {
                        console.log(e);
                    }
                }
            }
            if (typeof data.data === 'object' && data.data.reminders) {
                if (Array.isArray(data.data.reminders) && data.data.reminders.length > 0) {
                    this._reminders = new Set(
                        data.data.reminders
                            .map((id: string | number) => {
                                let num;
                                if (typeof id !== 'number') {
                                    num = Number.parseInt(id, 10);
                                    return Number.isNaN(num) ? 0 : num;
                                }
                                return id;
                            })
                            .filter((id: number) => id > 0),
                    );
                }
            }
        }

        if (!this.$.contentType) {
            this.$.contentType = CONTENT_TYPES.plain;
        }
        if (!this.$.type) {
            this.$.type = TYPES.normal;
        }
        if (!this.$.date) {
            this.$.date = Date.now();
        }

        if (!this.$.id) {
            this.$.id = createLocalID();
            this.$.index = this.$.id;
        }

        if (this.$.keys === null || this.$.keys === undefined) {
            if (this.isObjectContent) {
                const {objectContent} = this;
                this.$.keys = ['[url]', objectContent.url].join(' ');
            } else {
                this.$.keys = '';
            }
        }
    }

    /**
     * 获取此实例对应类上的代理对象处理对象
     * @returns 代理对象处理定义对象
     */

    override get proxyHandler() {
        return PROXY_HANDLER;
    }

    /**
     * 联合 Key，唯一标识一条消息并标识消息在会话中的顺序
     */
    get unionId() {
        return `${this.cgid}@${this.index}`;
    }

    /**
     * 获取用于发送到服务器的数据简单对象
     * @returns 简单对象
     */
    plainServer() {
        const data = {
            gid: this.gid,
            cgid: this.cgid,
            type: this.type,
            contentType: this.contentType,
            content: this.content,
            user: this.senderId,
            data: this.data as any,
            deleted: false,
        };
        if (typeof this.data !== 'string') {
            data.data = JSON.stringify(this.data);
            if (data.data === '{}') {
                data.data = '';
            }
        }
        if (this.deleted) {
            data.deleted = true;
        }
        return data;
    }

    /**
     * 获取数据库存储实体属性结构管理器
     */
    override get schema() {
        return SCHEMA;
    }

    /**
     * 获取是否发送成功
     */
    get isOK(): boolean {
        return !this.isInLocal;
    }

    /**
     * 获取当前状态是否已发送正在等待服务器结果
     */
    get isSending(): boolean {
        return this.isInLocal && !this.#isSendFailed && Date.now() - this.date < EXPIRATION_TIME;
    }

    /**
     * 标记为开始发送状态
     */
    beginSend() {
        this.$set('date', Date.now());
        this.#isSendFailed = false;
    }

    /**
     * 获取全局唯一标识字符串 GID
     */
    get cgid() {
        return this.$get('cgid');
    }

    /**
     * 设置全局唯一标识字符串 GID
     */
    set cgid(gid: string) {
        this.$set('cgid', gid);
    }

    /**
     * 消息在当前会话中的顺序
     */
    get index() {
        return this.$get('index');
    }

    /**
     * 消息在当前会话中的顺序
     */
    set index(i: number) {
        this.$set('index', i);
    }

    /**
     * 获取是否删除
     */
    get deleted() {
        return this.$get('deleted');
    }

    /**
     * 获取是否在本地被删除
     */
    get localDeleted() {
        return this.deleted && this.isInLocal;
    }

    /**
     * 标记为本地删除
     * @returns 如果返回 `true` 则标记成功
     */
    markLocalDeleted(): boolean {
        if (this.isInLocal) {
            this.$set('deleted', true);
            return true;
        }
        return false;
    }

    /**
     * 获取是否撤销
     */
    get retracted() {
        return this.deleted && !this.isInLocal;
    }

    /**
     * 判断当前消息是否能够撤销（远程删除）
     * @param user 当前用户对象
     * @returns 如果返回 `true` 则能够撤销，否则为不能撤销
     */
    canDelete(user: User): boolean {
        return (
            !this.isInLocal &&
            user.id === this.senderId &&
            user.serverNowTime.getTime() - this.sendTime <= DELETE_MESSAGE_TIME
        );
    }

    /**
     * 判断当前消息是否能够重新编辑
     * @param userID 当前用户 ID
     * @returns 如果返回 `true` 则能够重新编辑，否则为不能重新编辑
     */
    canReedit(userID: number): boolean {
        return (
            !this.isInLocal &&
            userID === this.senderId &&
            !this.getDataValue('deletedBy') &&
            this.deleted &&
            (this.isTextContent || this.isUrlObject) &&
            isNotEmptyString(this.content || this.contentBackup)
        );
    }

    /**
     * 执行重新编辑操作，删除消息内容备份
     * @returns 消息内容备份
     */
    doReedit() {
        const contentBackup = this.content || this.contentBackup;
        delete this.contentBackup;
        if (this.isUrlObject) {
            return this.objectContent.url;
        }
        return joypixels.shortnameToUnicode(contentBackup);
    }

    /**
     * 获取消息额外存储数据
     */
    get data(): any {
        if (this.#data === undefined) {
            this.#data = this.$get('data') || {};
        }
        return this.#data;
    }

    /**
     * 设置消息备份
     * @param value 消息内容
     */
    setBackup(value: string) {
        this.contentBackup = value;
    }

    /**
     * 获取消息额外数据属性值
     * @param name 属性名称
     * @param defaultValue 默认值
     * @returns 属性值
     */
    getDataValue(name: string, defaultValue?: any): any {
        const {data} = this;
        if (!data) {
            return defaultValue;
        }
        const value = data[name];
        return value === undefined ? defaultValue : value;
    }

    /**
     * 设置消息额外属性值
     * @param data 属性值
     */
    setDataValue(data: Record<string, any>) {
        this.#data = {...this.data, ...data};
        this.$set('data', this.#data);
    }

    /**
     * 获取此消息需要提醒的用户 ID 集合
     */
    get reminders() {
        if (this._reminders) {
            return this._reminders;
        }

        let reminders: ChatMessageLike['reminders'] | string[] = this.$get('reminders');
        let reminderSet: Set<number> | null = null;
        if (reminders) {
            if (typeof reminders === 'string') {
                reminders = reminders.split(',');
            }
            if (Array.isArray(reminders)) {
                reminders = reminders
                    .map((x) => (typeof x === 'string' ? Number.parseInt(x, 10) : x))
                    .filter((x) => typeof x === 'number' && !Number.isNaN(x) && x > 0);
                reminderSet = new Set(reminders);
            } else {
                reminderSet = null;
            }
        }
        this._reminders = reminderSet;
        return this._reminders;
    }

    /**
     * 指定的用户是否是此消息需要提醒的目标用户
     * @param memberID 成员 ID
     * @returns 如果返回 `true` 则为需要提醒的目标用户
     */
    isReminder(memberID: number): boolean {
        const {reminders} = this;
        return !reminders || reminders.size === 0 || reminders.has(memberID);
    }

    /**
     * 获取消息发送日期时间戳
     */
    get date() {
        return this.$get('date');
    }

    /**
     * 设置消息发送日期时间戳
     */
    set date(date: number) {
        this.$set('date', date);
    }

    /**
     * 获取消息发送日期时间戳，相当于读取 `date` 属性
     */
    get sendTime() {
        return this.date;
    }

    /**
     * 获取消息发送者 ID
     */
    get senderId() {
        const senderID = this.$get('user');
        return senderID;
    }

    /**
     * 判断给定的成员 ID 是否是当前消息发送者
     * @param userId 成员 ID
     * @returns 如果返回 `true` 则为是当前消息发送者，否则为不是当前消息发送者
     */
    isSender(userId: number): boolean {
        return this.senderId === userId;
    }

    /**
     * 获取消息发送者成员对象
     * @deprecated
     */
    get sender() {
        if (DEBUG) {
            console.log('The sender getter is deprecated, use "membersStore.getMember(chatMessage.senderID)" instead');
        }
        if (!this._sender) {
            return new Member({
                id: this.senderId,
            });
        }
        return this._sender;
    }

    /**
     * 设置消息发送者
     * @deprecated
     */
    set sender(sendUser: Member) {
        if (DEBUG) {
            console.log('The sender setter is deprecated');
        }
        if (sendUser) {
            this._sender = sendUser;
            this.$set('user', sendUser.id);
        }
    }

    get read() {
        return this.$get('read', []);
    }

    /**
     * 获取消息内容类型
     */
    get contentType() {
        return this.$get('contentType', CONTENT_TYPES.text);
    }

    /**
     * 设置消息内容类型
     */
    set contentType(type) {
        this.$set('contentType', type);
    }

    /**
     * 获取消息内容是否是文本
     */
    get isTextContent() {
        return this.contentType === CONTENT_TYPES.text || this.contentType === CONTENT_TYPES.plain;
    }

    /**
     * 获取消息内容是否是纯文本
     */
    get isPlainTextContent() {
        return this.contentType === CONTENT_TYPES.plain;
    }

    /**
     * 获取消息内容是否为表情
     */
    get isEmotionContent() {
        return (
            this.contentType === CONTENT_TYPES.emotion || (this.isImageContent && this.imageContent.type === 'emoji')
        );
    }

    /**
     * 获取表情内容
     */
    get emotionContent(): {type: 'emoji'; content: string} {
        let emotionContent = this._emotionContent;
        if (!emotionContent) {
            if (this.contentType === CONTENT_TYPES.emotion) {
                emotionContent = this.parseContent();
            } else if (this.isImageContent && this.imageContent.type === 'emoji') {
                emotionContent = this.imageContent;
            }
            this._emotionContent = emotionContent;
        }
        return emotionContent;
    }

    /**
     * 获取当前消息是否为 Url 对象类型
     */
    get isUrlObject() {
        return this.isObjectContent && this.objectContentType === OBJECT_TYPES.url;
    }

    /**
     * 获取通知类消息通知截止时间
     */
    get noticeEndTime() {
        return this.$get('noticeEndTime', 0);
    }

    /**
     * 获取消息内容是否是图片
     */
    get isImageContent() {
        return this.contentType === CONTENT_TYPES.image;
    }

    /**
     * 获取消息内容是否是对象
     */
    get isObjectContent() {
        return this.contentType === CONTENT_TYPES.object;
    }

    /**
     * 获取内容对象类型
     */
    get objectContentType(): string {
        return this.isObjectContent ? this.objectContent.type : null;
    }

    /**
     * 获取内容对象
     */
    get objectContent(): any {
        if (!this.isObjectContent) {
            return null;
        }

        let objectContent = this._objectContent;
        if (!objectContent) {
            objectContent = this.parseContent();
            if (objectContent?.path) {
                delete objectContent.path;
            }
            this._objectContent = objectContent;
        }
        return objectContent;
    }

    /**
     * 获取消息类型
     */
    get type() {
        return this.$get('type', TYPES.normal);
    }

    /**
     * 设置消息类型
     */
    set type(type) {
        this.$set('type', type);
    }

    /**
     * 获取消息类型是否为广播
     */
    get isBroadcast() {
        return this.type === TYPES.broadcast;
    }

    /**
     * 获取原始内容字符串
     */
    get content() {
        return this.$get('content');
    }

    /**
     * 设置原始内容字符串
     */
    set content(newContent: string) {
        this.$set('content', newContent);
        if (this._imageContent) {
            delete this._imageContent;
        }
        if (this._objectContent) {
            delete this._objectContent;
        }
        if (this._renderedTextContent) {
            delete this._renderedTextContent;
            delete this._isBlockContent;
        }
        if (this.contentBackup) {
            delete this.contentBackup;
        }
    }

    /**
     * 获取是否块级富文本消息（至少包含一个 3 级以上的标题）
     */
    get isBlockContent() {
        return !!(this._renderedTextContent && this._isBlockContent);
    }

    /**
     * 获取图片内容对象
     */
    get imageContent(): Record<string, any> {
        if (!this.isImageContent) {
            return null;
        }

        let imageContent = this._imageContent;
        if (!imageContent) {
            imageContent = this.parseContent();
            if (imageContent.path) {
                delete imageContent.path;
            }
            this._imageContent = imageContent;
        }
        if (imageContent) {
            imageContent.user = this.user;
            imageContent.senderId = this.senderId;
            imageContent.messageID = this.id;
            imageContent.cgid = this.cgid;
            imageContent.messageType = 'image';
            if (imageContent.type === 'base64') {
                imageContent.originFile = imageContent.content;
            } else if (this.attachFile) {
                imageContent.originFile = this.attachFile;
            }
            if (!imageContent.gid) {
                imageContent.gid = `file-${imageContent.id || this.gid}`;
            }
            if (this.cacheFilePath) {
                imageContent.cachePath = this.cacheFilePath;
            }
        }
        return imageContent;
    }

    /**
     * 设置图片内容对象
     */
    set imageContent(content: any) {
        this.contentType = CONTENT_TYPES.image;
        const mergeContent: any =
            content instanceof FileData
                ? content.plain()
                : {
                      name: content.name || content.title,
                      size: content.size,
                      send: content.send,
                      type: content.type,
                      id: content.id,
                      time: content.time,
                      gid: content.gid,
                      error: content.error,
                      content: content.content,
                      hasThumb: content.hasThumb,
                      thumbnailWidth: content.thumbnailWidth,
                      thumbnailHeight: content.thumbnailHeight,
                  };
        mergeContent.isImage =
            mergeContent.type && (mergeContent.type.startsWith('image') || mergeContent.type === 'base64');
        if (mergeContent.isImage) {
            mergeContent.width = content.width;
            mergeContent.height = content.height;
            mergeContent.mediaType = 'image';
        }
        delete mergeContent.path;
        this.content = JSON.stringify(mergeContent);

        if (content instanceof FileData) {
            this.attachFile = content.originFile;
        }

        this._imageContent = mergeContent;
    }

    /**
     * 更新图片内容对象
     * @param content 图片内容对象
     */
    updateImageContent(content: any) {
        this.imageContent = {...this.imageContent, ...content};
    }

    /**
     * 本地缓存文件路径
     */
    get cacheFilePath() {
        return this.$get('cacheFilePath');
    }

    /**
     * 设置本地缓存文件路径
     */
    set cacheFilePath(filePath: string) {
        this._imageContent = null;
        this.$set('cacheFilePath', filePath);
    }

    /**
     * 获取消息指令对象
     * @returns 消息指令对象
     */
    getCommand() {
        if (this.isTextContent) {
            const content = this.content.trim();
            if (content === '$$version') {
                return {action: 'version'};
            }
            if (content === '$$dataPath') {
                return {action: 'dataPath'};
            }
        }
        return null;
    }

    /**
     * 检查消息是否在本地（没有发送到服务器）
     */
    get isInLocal() {
        return isLocalID(this.id);
    }

    /**
     * 获取是否发送失败
     */
    get isSendFailed() {
        return this.isInLocal && (this.#isSendFailed || Date.now() - this.date >= EXPIRATION_TIME);
    }

    /**
     * 标记为发送失败
     */
    markSendFailed() {
        if (this.isInLocal) {
            this.#isSendFailed = true;
        }
    }

    /**
     * 将 content 作为 JSON 转为实际值
     * @param defaultData 转换失败时返回的默认值
     * @returns 转换后的值
     */
    parseContent(defaultData: any = {}): any {
        const content = this.content || this.contentBackup;
        if (!content) {
            return defaultData;
        }
        try {
            if (typeof content === 'object') {
                return content;
            }
            return JSON.parse(content) || content;
        } catch (error) {
            if (DEBUG) {
                console.error('Cannot parse content data for chat message', this);
            }
            return defaultData;
        }
    }

    /**
     * 检查此消息是否能够被置顶
     * @returns 如果返回 `true` 则为能置顶，否则不能置顶
     */
    canPin(): boolean {
        return !this.isBroadcast && (this.isTextContent || this.isImageContent);
    }

    /**
     * 返回用于存储的简单对象
     * @returns 简单对象
     */
    override plain() {
        const {cgid, content, contentType, data, date, deleted, gid, id, index, type, senderId, unionId, read} = this;
        return {
            cgid,
            content,
            contentType,
            data,
            date,
            deleted,
            gid,
            id,
            index,
            type,
            keys: this.$get('keys'),
            user: senderId,
            unionId,
            read,
        };
    }

    static create = createChatMessage;

    static sort = sortChatMessages;
}

/**
 * 对聊天消息列表进行排序
 * @param messages 要排序的聊天列表
 * @returns 排序后的聊天列表
 * @static
 */
export function sortChatMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.sort((x, y) => (x.id || Number.MAX_SAFE_INTEGER) - (y.id || Number.MAX_SAFE_INTEGER));
}

/**
 * 创建一个聊天消息类实例
 * @param message 聊天消息属性对象或者聊天消息实例
 * @returns 聊天消息类实例
 */
export function createChatMessage(message: ChatMessage | ChatMessageLike): ChatMessage {
    if (message instanceof ChatMessage) {
        return message;
    }
    return new ChatMessage(message);
}

if (DEBUG) {
    global.$ChatMessage = ChatMessage;
}
