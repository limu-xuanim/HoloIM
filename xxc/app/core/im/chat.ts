import {type CONTENT_TYPES, TYPES as CHATMESSAGE_TYPES} from '~/app/core/im/chat-message';
import Entity from '../db/entity';
import {createProxyPropertiesMap, createProxyHandler} from '~/app/utils/proxy-helper';
import {TIME_DAY} from '~/app/utils/date-helper';
import {generateContinuousList} from '~/app/utils/list-helper';

/**
 * 生成一对一聊天 Gid
 * @param member1ID 第一个用户 ID
 * @param member2ID 第二个用户 ID
 * @returns 一对一聊天 Gid
 */
export const createOne2OneChatGid = (member1ID: number, member2ID: number) => [member1ID, member2ID].sort().join('&');

/** 最近消息最大数目 */
export const DEFAULT_LATEST_MESSAGES_COUNT = 30;

/** 聊天类型表 */
export enum TYPES {
    one2one = 'one2one',
    group = 'group',
    system = 'system',
}

/** 白名单类型表 */
enum COMMITTERS_TYPES {
    whitelist = 'whitelist',
    all = 'all'
}

/** 实体名称 */
const NAME = 'Chat';

/** avatar 属性的类型 */
export type TextAvatar = {
    type: 'text',
    data: {
        bgColor: string,
        customText: string
    }
}
export type ImageAvatar = {
    type: 'image',
    data: {
        imgUrl: string
    }
}
export type ChatAvatar = TextAvatar | ImageAvatar;

/** 数据库存储实体属性结构管理器 */
const SCHEMA = Entity.SCHEMA.extend({
    type: {type: 'string', indexed: true},
    name: {type: 'string', indexed: true},
    createdDate: {type: 'timestamp'},
    createdBy: {type: 'string'},
    ownedBy: {type: 'string'},
    editedDate: {type: 'timestamp'},
    lastActiveTime: {type: 'timestamp', indexed: true},
    dismissDate: {type: 'timestamp'},
    star: {type: 'boolean'},
    mute: {type: 'boolean'},
    public: {type: 'boolean'},
    hide: {type: 'boolean'},
    members: {type: 'set'},
    pinnedMessages: {type: 'array'}, // 该会话中已置顶的消息 ID 列表
    committers: {type: 'string'},
    freeze: {type: 'boolean'},
    deleted: {type: 'boolean'},
    lastMessageInfo: {type: 'json'}, // 该会话最后一条消息信息，包含消息内容预览文本
    lastAccessTime: {type: 'timestamp', indexed: true}, // 用户上次访问此会话的时间戳
    lastReadMessageIndex: {type: 'int', default: 0},
    theOtherMemberID: {type: 'int'}, // 一对一会话对方用户 ID
    localMessages: {type: 'json'}, // 会话中的本地消息（没有发送到服务器）
    avatar: {type: 'object'}, // 群组头像信息
});

/** 代理对象属性定义 */
const PROXY_PROPERTIES = createProxyPropertiesMap([
    'type',
    'name',
    'createdDate',
    'ownedBy',
    'createdBy',
    'editedDate',
    'lastActiveTime',
    'dismissDate',
    'star',
    'mute',
    'public',
    'members',
    'pinnedMessages',
    'committers',
    'freeze',
    'noticeCount',
    'avatar',
], Entity.PROXY_PROPERTIES);

/** 代理对象拦截处理对象 */
const PROXY_HANDLER = createProxyHandler(PROXY_PROPERTIES);

export type ChatLike = Partial<{
    id: number;
    gid: string;
    deleted: boolean;
    type: TYPES;
    name: string;
    star: boolean;
    mute: boolean;
    hide: boolean;
    public: boolean;
    avatar: ChatAvatar|string;
    createdBy: string;
    ownedBy: string;
    createdDate: number;
    editedDate: number;
    dismissDate: number;
    pinnedMessages: number[];
    latestMessageIndexes: number[];
    committers: string;
    members: number[]|Set<number>;
    lastActiveTime: number;
    lastAccessTime: number;
    lastReadMessageIndex: number;
    localMessages: Record<string, number>;
    freeze: boolean;
    theOtherMemberID: number;
    delete: boolean;
    lastMessageInfo: {
        cgid: string;
        content: string;
        contentType: CONTENT_TYPES;
        data: Record<string, any>;
        date: number;
        deleted: boolean;
        gid: string;
        id: number;
        index: number;
        type: CHATMESSAGE_TYPES;
        user: number;
        senderId: number;
        keys: string;
    };
}>;

/**
 * 聊天类
 * @extends {Entity}
 */
export default class Chat extends Entity<ChatLike> {
    /** 实体名称 */
    static override NAME = NAME;

    /** 聊天类型表 */
    static TYPES = TYPES;

    /** 白名单类型表 */
    static COMMITTERS_TYPES = COMMITTERS_TYPES;

    /** 数据库存储实体属性结构管理器 */
    static override SCHEMA = SCHEMA;

    /** 代理对象属性定义 */
    static override PROXY_PROPERTIES = PROXY_PROPERTIES;

    /** 代理对象拦截处理对象 */
    static override PROXY_HANDLER = PROXY_HANDLER;

    /** 获取此聊天的文件下载完成消息数目 */
    fileSavedNoticeCount = 0;

    /** 聊天中的名称汉语拼音 */
    pinyin: string;

    /** 最近会话消息，用于加载消息列表 */
    #latestMessageIndexes: number[] = [];

    /** 未读且已撤回消息的 ID 集合 */
    private unreadAndDeletedMsgIdxSet = new Set<number>();

    /** 无需提醒的消息 Index 集合 */
    private ignoreMessageIndexes = new Set<number>();

    /** 未读消息集合 */
    private unreadMessageSet = new Set<number>();

    /** 草稿信息 */
    draft: string;

    expired: boolean;

    score: number;

    /**
     * 创建一个聊天类实例
     * @param data 聊天属性对象
     * @param entityType 实体类型名称
     */
    constructor(data: ChatLike, entityType = NAME) {
        super(data, entityType);
        if (data.latestMessageIndexes) {
            this.#latestMessageIndexes = data.latestMessageIndexes;
        }
        if (this.#latestMessageIndexes.length === 0 && this.lastMessageIndex) {
            this.#latestMessageIndexes.push(this.lastMessageIndex);
        }
        this.updateUnreadMessages();
    }

    /**
     * 获取此实例对应类上的代理对象处理对象
     */

    override get proxyHandler() {
        return PROXY_HANDLER;
    }

    /**
     * 调用此方法确保实体拥有合适的 GID 属性
     * @override
     */
    override ensureGid() {
        if (this.isOne2One) {
            const {members} = this;
            if (members.size === 2) {
                if (!this.$.gid) {

                    // @ts-ignore
                    this.$.gid = createOne2OneChatGid(...members);
                }
            } else if (this.$.gid) {
                // 修复 members 错误
                this.setMembers(this.$.gid.split('&').map((x: string) => Number.parseInt(x, 10)));
            } else {
                throw new Error('One2One chat gid error.');
            }
        } else {
            super.ensureGid();
        }
    }

    /**
     * 获取数据库存储实体属性结构管理器
     */

    override get schema() {
        return SCHEMA;
    }

    /**
     * 设置 ID 属性
     */
    override set id(remoteId: number) {
        super.id = remoteId;
    }

    /**
     * 获取 ID 属性值
     */
    override get id() {
        return this.$get('id');
    }

    /**
     * 获取是否已经删除
     */
    get isDeleted() {
        return this.$get('deleted');
    }

    /**
     * 设置是否已经删除
     */
    set isDeleted(flag) {
        this.$set('deleted', flag);
    }

    /**
     * 获取一对一会话对方是否已删除
     */
    get isDeletedOne2One() {
        return this.isOne2One && this.isDeleted;
    }

    /**
     * 是否为已退出的讨论组
     */
    get isNotInGroup() {
        return !this.isOne2One && this.isDeleted;
    }

    /**
     * 获取聊天类型
     */
    get type() {
        const type = this.$get('type');
        if (type) {
            return type;
        }
        const {members} = this;
        return (members && members.size === 2) ? TYPES.one2one : TYPES.group;
    }

    /**
     * 设置聊天类型
     */
    set type(type: TYPES) {
        this.$set('type', type);
    }

    /**
     * 获取是否一对一聊天类型
     */
    get isOne2One() {
        return this.type === TYPES.one2one;
    }

    /**
     * 获取是否讨论组
     */
    get isGroup() {
        return this.type === TYPES.group;
    }

    /**
     * 获取是否是系统聊天
     */
    get isSystem() {
        return this.type === TYPES.system;
    }

    /**
     * 获取是否是讨论组或系统聊天
     */
    get isGroupOrSystem() {
        return this.isGroup || this.isSystem;
    }

    /**
     * 是否为用户私人会话
     */
    get isPrivate() {
        return /^(\d+)&\1$/.test(this.gid);
    }

    /**
     * 获取聊天名称
     */
    get name() {
        return this.$get('name');
    }

    /**
     * 设置聊天名称
     */
    set name(newName: string) {
        this.$set('name', newName);
    }

    /**
     * 获取是否已收藏此聊天
     */
    get star() {
        if (this.isSystem) {
            return true;
        }
        return this.$get('star');
    }

    /**
     * 设置是否已收藏此聊天
     */
    set star(star: boolean) {
        this.$set('star', star);
    }

    /**
     * 获取是否已设置为免打扰
     */
    get mute() {
        return this.$get('mute');
    }

    /**
     * 设置是否已设置为免打扰
     */
    set mute(mute: boolean) {
        this.$set('mute', mute);
    }

    /**
     * 获取是否已经隐藏（存档）此聊天，相当于读取 `hide` 属性
     */
    get hidden() {
        return this.hide;
    }

    /**
     * 设置是否已经隐藏（存档）此聊天，相当于设置 `hide` 属性
     */
    set hidden(hide: boolean) {
        this.hide = hide;
    }

    /**
     * 获取是否已经隐藏（存档）此聊天
     */
    get hide() {
        return this.$get('hide');
    }

    /**
     * 设置是否已经隐藏（存档）此聊天
     */
    set hide(hide: boolean) {
        this.$set('hide', hide);
    }

    /**
     * 获取是否已设为公开聊天
     */
    get public() {
        return this.$get('public');
    }

    /**
     * 设置是否已设为公开聊天
     */
    set public(flag: boolean) {
        this.$set('public', flag);
    }

    /**
     * 获取群头像信息
     */
    get avatar(): ChatAvatar|string {
        return this.$get('avatar');
    }

    /**
     * 设置群头像信息
     */
    set avatar(avatar: ChatAvatar|string) {
        this.$set('avatar', avatar);
    }

    /**
     * 将avatar对象信息转换为string
     */
    static plainAvatar(avatar: ChatAvatar|string): string {
        return JSON.stringify(avatar);
    }

    /**
     * 获取聊天的创建者用户名
     */
    get createdBy() {
        return this.$get('createdBy');
    }

    /**
     * 设置聊天的创建者用户名
     */
    set createdBy(createdBy: string) {
        this.$set('createdBy', createdBy);
    }

    /**
     * 获取聊天的所有者用户名
     */
    get ownedBy() {
        return this.$get('ownedBy');
    }

    /**
     * 设置聊天的所有者用户名
     */
    set ownedBy(ownedBy: string) {
        this.$set('ownedBy', ownedBy);
    }

    /**
     * 获取聊天创建时间戳
     */
    get createdDate() {
        return this.$get('createdDate');
    }

    /**
     * 设置聊天创建时间戳
     */
    set createdDate(createdDate: number) {
        this.$set('createdDate', createdDate);
    }

    /**
     * 获取上次群组发生变更的时间戳
     */
    get editedDate() {
        return this.$get('editedDate', 0);
    }

    /**
     * 设置聊天更新时间戳
     */
    set editedDate(editedDate: number) {
        this.$set('editedDate', editedDate);
    }

    /**
     * 获取聊天解散时间戳
     */
    get dismissDate() {
        return this.$get('dismissDate');
    }

    /**
     * 设置聊天解散时间戳
     */
    set dismissDate(dismissDate: number) {
        this.$set('dismissDate', dismissDate);
    }

    /**
     * 获取是否已经解散此聊天
     */
    get isDismissed(): boolean {
        return !!this.dismissDate;
    }

    /**
     * 判断指定的用户是否能够解散此聊天
     * @param user 成员对象
     * @returns 如果返回 `true` 则可以解散，否则为不是
     */
    canDismiss(user: Member): boolean {
        return !this.isDismissed && this.isGroup && this.isOwner(user);
    }

    /**
     * 获取聊天置顶消息集合
     */
    get pinnedMessages() {
        return this.$get('pinnedMessages', []);
    }

    /**
     * 设置聊天置顶消息
     * @param pinnedMessages 置顶消息
     */
    set pinnedMessages(pinnedMessages: number[]) {
        this.$set('pinnedMessages', pinnedMessages);
    }

    /**
     * 判断给定的消息是否是此聊天的置顶消息
     * @param messageId 消息 ID
     * @returns 如果为 `true` 则为是此聊天置顶消息，否则为不是
     */
    isPinnedMessage(messageId: number): boolean {
        const {pinnedMessages} = this;
        if (pinnedMessages?.length) {
            return pinnedMessages.includes(messageId);
        }
        return false;
    }

    /**
     * 获取白名单设置
     */
    get committers(): Set<string> {
        const committers = this.$get('committers');
        if (!committers || committers === '$ADMINS') {
            return new Set();
        }
        return new Set(committers.split(','));
    }

    /**
     * 设置白名单配置
     * @param committers 白名单
     */
    setCommitters(committers: string) {
        this.$set('committers', committers);
    }

    /**
     * 获取白名单类型
     */
    get committersType() {
        const committers = this.$get('committers');
        if ((this.isSystem || this.isGroup) && committers && committers !== '$ALL') {
            return COMMITTERS_TYPES.whitelist;
        }
        return COMMITTERS_TYPES.all;
    }

    /**
     * 判断给定的用户是否在白名单中
     * @param member 用户 ID 或者用户对象
     * @returns 如果返回 `true` 则为在白名单中，否则为不在
     */
    isCommitter(member: Member|User): boolean {
        switch (this.committersType) {
            case COMMITTERS_TYPES.whitelist:
                return this.isInWhitelist(member.id);
            default:
                return true;
        }
    }

    /**
     * 判断给定的成员是否是能够重命名此聊天
     * @param user 成员对象
     * @returns 如果为 `true` 则能够重命名此聊天，否则为不能
     */
    canRename(user: Member): boolean {
        if (this.isDismissed) {
            return false;
        }

        if (this.isLocal) {
            return false;
        }

        if (this.isPrivate) {
            return true;
        }

        return (this.isGroup || this.isSystem) && this.isOwner(user);
    }

    /**
     * 判断给定的成员是否是能够邀请其他成员参与此聊天
     * @param user 成员对象
     * @returns 如果为 `true` 则能够邀请其他成员参与此聊天，否则为不能
     */
    canInvite(user: Member): boolean {
        return !this.isDismissed
            && (!this.isSystem)
            && (this.members.has(user.id))
            && (this.isOwner(user) || (this.isCommitter(user) && this.public));
    }

    /**
     * 判断给定的成员是否是能够将聊天内成员移除此聊天
     * @param user 成员对象
     * @param kickOfWho 要移除的成员对象
     * @returns 如果为 `true` 则能够将聊天内成员移除此聊天，否则为不能
     */
    canKickOff(user: Member, kickOfWho?: Member): boolean {
        return this.isGroup && !this.isSystem && (!kickOfWho || kickOfWho.id !== user.id) && this.isOwner(user);
    }

    /**
     * 判断给定的成员是否是能够将聊天设置为公开或者取消公开设置
     * @param user 成员对象
     * @returns 如果为 `true` 则能够将聊天设置为公开或者取消公开设置，否则为不能
     */
    canMakePublic(user: Member) {
        return !this.isDismissed && this.isOwner(user) && this.isGroup;
    }

    /**
     * 判断给定的成员是否是能够修改此聊天的白名单
     *
     * @param user 成员对象
     * @returns 如果为 `true` 则能够修改此聊天的白名单，否则为不能
     */
    canSetCommitters(user: Member): boolean {
        return !this.isDismissed && this.isOwner(user) && !this.isOne2One;
    }

    /**
     * 判断此聊天对于指定的用户是否只读（无法发送消息）
     *
     * @param member 成员对象
     * @returns 如果为 `true` 则为只读，否则不是
     */
    isReadonly(member: Member|User): boolean {
        return this.isDeleted || this.isDismissed || !this.isCommitter(member);
    }

    /**
     * 检查会话是否可见
     * @param dismissedGroupLife 可见的时间（单位：天）
     * @returns 如果为 true 则为可见
     */
    isVisible(dismissedGroupLife = 90): boolean {
        const {dismissDate} = this;
        if (dismissDate) {
            const now = Date.now();
            return now <= (dismissDate + dismissedGroupLife * TIME_DAY);
        }
        return true;
    }

    /**
     * 获取会话最后可见时间戳，单位毫秒
     * @param dismissedGroupLife 可见的时间（单位：天）
     * @returns 最后可见时间
     */
    getFinalVisibleDate(dismissedGroupLife: number): number {
        const {dismissDate} = this;
        return dismissDate ? (dismissDate + dismissedGroupLife * TIME_DAY) : 0;
    }

    /**
     * 获取是否设置有白名单
     */
    get hasWhitelist(): boolean {
        return this.committersType === COMMITTERS_TYPES.whitelist;
    }

    /**
     * 获取此聊天的白名单
     */
    get whitelist(): Set<number> {
        if (!this.hasWhitelist) {
            return null;
        }

        const set = new Set<number>();
        for (const x of this.committers) {
            const id = Number.parseInt(x, 10);
            if (!Number.isNaN(id)) {
                set.add(id);
            }
        }
        return set;
    }

    /**
     * 设置此聊天的白名单
     * @param value 白名单
     */
    set whitelist(value: Set<number>) {
        if (!this.isGroupOrSystem) {
            this.$set('committers', '');
        }
        this.$set('committers', Array.from(value).join(','));
    }

    /**
     * 判断给定的用户 ID 是否在白名单中
     * @param memberId 用户 ID
     * @param whitelist 白名单
     * @returns 如果返回 `true` 则为在白名单中，否则为不在
     */
    isInWhitelist(memberId: number, whitelist: Set<number> = this.whitelist): boolean {
        if (whitelist?.size) {
            return whitelist.has(memberId);
        }
        return false;
    }

    /**
     * 将给定的用户 ID 添加到白名单中
     * @param memberId 用户 ID
     * @returns 如果返回 `true` 则为添加成功，否则为添加失败
     */
    addToWhitelist(memberId: number): boolean {
        const {whitelist} = this;
        if (whitelist && !whitelist.has(memberId)) {
            whitelist.add(memberId);
            this.whitelist = whitelist;
            return true;
        }
        return false;
    }

    /**
     * 将给定的用户 ID 从白名单中移除
     * @param memberId 用户 ID
     * @returns 如果返回 `true` 则为移除成功，否则为移除失败
     */
    removeFromWhitelist(memberId: number): boolean {
        const {whitelist} = this;
        if (whitelist?.has(memberId)) {
            whitelist.delete(memberId);
            this.whitelist = whitelist;
            return true;
        }
        return false;
    }

    /**
     * 获取聊天成员 ID 集合
     */
    get members(): Set<number> {
        const _members = this.$get('members');
        return _members instanceof Set
            ? _members
            : new Set(_members);
    }

    /**
     * 设置聊天成员
     */
    setMembers(newMembers: Iterable<number>) {
        const members: Set<number> = newMembers instanceof Set ? newMembers : new Set(newMembers);
        this.$set('members', members);
    }

    /**
     * 判断给定的成员 ID 是否在此聊天成员集合中
     * @param memberId 聊天成员 ID
     * @returns 如果返回 `true` 则为在此聊天成员集合中，否则为不在
     */
    isMember(memberId: number): boolean {
        if (this.isSystem) {
            return true;
        }
        return this.members.has(memberId);
    }

    /**
     * 判断给定的用户是否是聊天的创建者
     * @param user 聊天成员对象
     * @returns 如果返回 `true` 则为是聊天的创建者，否则为不是聊天的创建者
     */
    isOwner(user: Member|User): boolean {
        return this.ownedBy
            ? user.account === this.ownedBy
            : user.account === this.createdBy;
    }

    /**
     * 获取是否能够让其他成员自由加入
     */
    get canJoin(): boolean {
        return !this.isDismissed && this.public && this.isGroup;
    }

    /**
     * 判断给定的用户是否能够退出讨论组
     * @returns {boolean} 如果返回 `true` 则为能够退出讨论组，否则为不能够退出讨论组
     */
    canExit(): boolean {
        return this.isGroup;
    }

    /**
     * 获取是否隐藏此聊天
     */
    get canHide(): boolean {
        return this.isGroup;
    }

    /**
     * 获取此聊天是否已被设置为免打扰或者隐藏（已存档）
     */
    get isMuteOrHidden(): boolean {
        return this.mute || this.hidden;
    }

    /**
     * 设置上次收到消息的时间戳
     * @param time 上次收到消息的时间戳
     * @deprecated 尝试使用 lastMessage 进行重构
     */
    set lastActiveTime(time: number) {
        this.$set('lastActiveTime', time);
    }

    /**
     * 获取上次在收到消息的时间戳
     * @deprecated 尝试使用 lastMessage 进行重构
     */
    get lastActiveTime() {
        let lastActiveTime = this.$get('lastActiveTime', 0) || this.editedDate || this.createdDate;
        const {lastMessageInfo} = this;
        if (lastMessageInfo && lastMessageInfo.date > lastActiveTime) {
            lastActiveTime = lastMessageInfo.date;
        }
        return lastActiveTime;
    }

    /**
     * 获取上次在界面上访问的时间戳
     * @deprecated 尝试使用 lastMessage 进行重构
     */
    get lastAccessTime() {
        let lastAccessTime = this.$get('lastAccessTime');
        if (!lastAccessTime) {
            lastAccessTime = this.lastActiveTime;
        }
        return lastAccessTime || 0;
    }

    /**
     * 设置上次上次在界面上访问的时间戳
     * @param time 上次上次在界面上访问的时间戳
     * @deprecated 尝试使用 lastMessage 进行重构
     */
    set lastAccessTime(time: number) {
        this.$set('lastAccessTime', time);
    }

    /**
     * 最新的消息 Index 列表，从小到大排列
     */
    get latestMessageIndexes(): number[] {
        return this.#latestMessageIndexes;
    }

    /**
     * 检查 index 连续性
     * @param len 长度
     */
    checkLatestMessageIndexes(len = 20) {
        const {length} = this.latestMessageIndexes;
        if (length < 2) {
            return;
        }

        // 如果有额外插入的消息 (index 为小数)，不要检查连续性
        if (this.latestMessageIndexes.some(i => i % 1 !== 0)) {
            return;
        }

        const firstIndex = this.latestMessageIndexes[0];
        const lastIndex = this.lastMessageIndex;

        if (lastIndex - firstIndex + 1 === length) {
            return;
        }

        let prevIndex = lastIndex;

        for (let i = length - 2; i >= 0; i--) {
            const index = this.latestMessageIndexes[i];
            if (prevIndex - index === 1) {
                prevIndex = index;
                continue;
            }
            break;
        }

        this.#latestMessageIndexes = generateContinuousList(Math.max(prevIndex - len, 1), Math.max(lastIndex, 1), true);
    }

    /**
     * 缩小最近消息列表范围
     * @param length 要保留的长度，默认保留一百条
     */
    shrinkMessageIndexList(length = 100) {
        const {latestMessageIndexes} = this;
        if (latestMessageIndexes.length > length) {
            this.#latestMessageIndexes = latestMessageIndexes.slice(latestMessageIndexes.length - length);
        }
    }

    /**
     * 获取会话的最后一条消息
     */
    get lastMessageInfo(): ChatLike['lastMessageInfo'] {
        return this.$get('lastMessageInfo');
    }

    /**
     * 获取会话最后一条消息的 Index
     */
    get lastMessageIndex() {
        return this.lastMessageInfo?.index || 0;
    }

    /**
     * 最后一条已读消息的 Index
     */
    get lastReadMessageIndex() {
        return this.$get('lastReadMessageIndex') || 0;
    }

    /**
     * 获取此聊天的未读消息数目
     */
    get unreadMessagesCount() {
        return this.unreadMessageIndexes?.size || 0;
    }

    /**
     * 检查此聊天的是否拥有未读消息
     */
    get hasUnreadMessages() {
        return this.unreadMessagesCount > 0;
    }

    /**
     * 未读消息 Index 集合，只读
     */
    get unreadMessageIndexes() {
        return this.unreadMessageSet;
    }

    /**
     * 通过计算生成未读消息集合
     */
    updateUnreadMessages() {
        if (!this.lastMessageInfo || this.lastMessageIndex <= this.lastReadMessageIndex || this.lastReadMessageIndex % 1 !== 0 || this.lastMessageIndex % 1 !== 0) {
            this.unreadMessageSet = new Set<number>();
            return;
        }

        const unreadMessages = new Set<number>(generateContinuousList(this.lastMessageIndex, this.lastReadMessageIndex + 1, false));
        for (const x of this.unreadAndDeletedMsgIdxSet) {
            if (this.lastReadMessageIndex > x) {
                this.unreadAndDeletedMsgIdxSet.delete(x);
                continue;
            }
            if (unreadMessages.has(x)) {
                unreadMessages.delete(x);
            }
        }
        for (const index of Array.from(unreadMessages)) {
            if (this.ignoreMessageIndexes.has(index)) {
                unreadMessages.delete(index);
            }
        }
        this.unreadMessageSet = unreadMessages;
    }

    /**
     * 判定给定的消息是否为未读消息
     * @param messageIndex 消息 Index
     * @returns 如果为 `true` 则为未读消息，否则为已读消息
     */
    isUnreadMessage(messageIndex: number): boolean {
        return this.unreadMessageIndexes.has(messageIndex);
    }

    /**
     * 将最后一个已读消息 index 设置为最后的消息 index
     * @param messageIndex 消息 index
     * @returns 如果为 true，则设置成功
     */
    setLastReadMessageIndex(messageIndex: number): boolean {
        const {lastReadMessageIndex, lastMessageIndex} = this;
        let result = false;

        if (messageIndex > lastReadMessageIndex && messageIndex <= lastMessageIndex) {
            this.$set('lastReadMessageIndex', messageIndex);
            result = true;

            for (const unreadIndex of this.unreadMessageSet) {
                if (unreadIndex <= messageIndex) {
                    this.unreadMessageSet.delete(unreadIndex);
                }
            }
        }
        return result;
    }

    /**
     * 清除此聊天的未读消息标记
     * @returns 已新标记为已读的消息清单
     */
    muteUnreadMessages() {
        this.fileSavedNoticeCount = 0;
        return this.setLastReadMessageIndex(this.lastMessageIndex);
    }

    /**
     * 获取本地消息
     * <gid, index>
     */
    get localMessages() {
        return this.$get('localMessages') ?? {};
    }

    /**
     * 本地消息列表
     */
    get localMessagesList() {
        return Object.values(this.localMessages).sort((x, y) => x - y);
    }

    /**
     * 设置最新消息
     * @param messages 会话消息列表
     * @param options 选项
     * @param options.currentUserID 当前用户 ID
     * @param options.isFocusedActiveChat 当前是否为已激活且获得焦点的会话
     * @returns 设置结果
     */
    setLatestMessages(messages: ChatMessage[], options: Partial<{currentUserID: number; isFocusedActiveChat: boolean;}> = {}) {
        const {
            currentUserID,
            isFocusedActiveChat = false
        } = options;

        const {
            latestMessageIndexes,
            localMessages,
            mute,
            lastMessageInfo,
            lastMessageIndex,
            lastReadMessageIndex,
            isDismissed,
            isDeleted,
        } = this;

        /** 记录消息列表是否发生变更 */
        let latestMessagesUpdated = false;

        /** 记录消息列表是否发生变更 */
        let localMessagesChanged = false;

        /** 新的最后阅读消息 Index */
        let newLastReadMessageIndex = lastReadMessageIndex;

        /** 新的最后一条消息 Index */
        let newLastMessageIndex = lastMessageIndex;

        // 新的未读消息 ID 列表
        const newUnread: number[] = [];

        // 被移除的未读消息 ID 列表
        const deletedUnread: number[] = [];

        // 新收到的消息 ID 列表
        const newMessages: number[] = [];

        /** 新的最后一条消息对象 */
        let newLastMessage: typeof lastMessageInfo | null = null;

        /** 消息列表 Index 集合 */
        const latestMessageIndexSet = new Set<number>(latestMessageIndexes);

        /** 本地被删除的消息列表 */
        const localDeletedMessages = [];

        /** 确定该会话中的消息应该被标记为已读 */
        const isSurelyRead = isFocusedActiveChat || isDismissed || isDeleted;

        for (const message of messages) {
            const {id, gid, index, deleted, isInLocal} = message;

            // 本地消息
            if (isInLocal) {
                // 本地消息且已经撤回，则从本地消息以及消息列表中移除
                if (deleted) {
                    localDeletedMessages.push(id);

                    // 删除本地消息
                    if (localMessages[gid]) {
                        delete localMessages[gid];
                        localMessagesChanged = true;
                    }

                    continue;
                }
                // 未撤回的本地消息说明刚刚发送，则在本地消息中添加
                localMessages[gid] = id;
                localMessagesChanged = true;
                continue;
            }

            // 服务器返回的消息
            // 本地消息中存在该消息则删除，并使用 ID 来替代 本地消息ID
            if (localMessages[gid]) {
                const localMessageId = localMessages[gid];
                delete localMessages[gid];
                localMessagesChanged = true;

                // 删除消息列表，本地消息的 ID 和 Index 相同
                if (latestMessageIndexSet.has(localMessageId)) {
                    latestMessageIndexSet.delete(localMessageId);
                    latestMessagesUpdated = true;
                }
            }

            // 尝试将消息添加到列表
            if (!latestMessageIndexSet.has(index)) {
                latestMessageIndexSet.add(index);
                latestMessagesUpdated = true;
            }

            // 设置最后一条消息信息 Index
            if (newLastMessageIndex <= index) {
                newLastMessageIndex = index;

                // 存储最后一条消息以便于更新 lastMessageInfo
                newLastMessage = message.plain();
            }

            // 尝试从未读消息列表中移除被撤销的消息
            if (deleted) {
                this.unreadAndDeletedMsgIdxSet.add(index);
                deletedUnread.push(id);
            }

            const isSendByMe = currentUserID && message.isSender(currentUserID);
            const isReminder = !currentUserID || message.isReminder(currentUserID);

            if (!isReminder) {
                this.ignoreMessageIndexes.add(index);
                if (DEBUG_I) {
                    console.collapse(
                        gid,
                        'green',
                        'add ignore message indexes',
                        'pinkPale',
                        `id:${id}, index:${index}, deleted:${deleted}, isInLocal:${isInLocal}`,
                        '',
                    );
                    console.log('message:', message);
                    console.log('lastMessageInfo:', this.lastMessageInfo);
                    console.log('lastReadMessageIndex:', this.lastReadMessageIndex);
                    console.groupEnd();
                }
            }

            // 更新最后阅读消息 Index
            if ((newLastReadMessageIndex < index) && (isSurelyRead || isSendByMe)) {
                newLastReadMessageIndex = index;
            }

            if (!isSendByMe && isReminder && !deleted && index > newLastReadMessageIndex) {
                newUnread.push(id);
            }

            if (!isSendByMe && !deleted && !mute && index > newLastReadMessageIndex) {
                newMessages.push(id);
            }
        }

        const updated = new Set<string>();

        if (localMessagesChanged) {
            this.$set('localMessages', localMessages);
            updated.add('localMessages');
        }

        if (newLastMessage && (!lastMessageInfo || lastMessageInfo.index < newLastMessage.index || lastMessageInfo.deleted !== newLastMessage.deleted)) {
            if (newLastMessage?.type === CHATMESSAGE_TYPES.notify && typeof newLastMessage?.data === 'string') {
                try {
                    this.$set('lastMessageInfo', {...newLastMessage, data: JSON.parse(newLastMessage.data)});
                } catch {
                    this.$set('lastMessageInfo', newLastMessage);
                }
            } else {
                this.$set('lastMessageInfo', newLastMessage);
            }

            updated.add('lastMessageInfo');
        }

        if (newLastReadMessageIndex !== lastReadMessageIndex) {
            this.setLastReadMessageIndex(newLastReadMessageIndex);
        }

        /** 是否取消从最近会话列表移除 */
        let frozenCanceled = false;
        if (newLastMessageIndex > lastMessageIndex) {
            if (this.frozen) {
                this.frozen = false;
                frozenCanceled = true;
            }
        }

        if (latestMessagesUpdated) {
            this.#latestMessageIndexes = [...latestMessageIndexSet].sort((x, y) => x - y);
            this.checkLatestMessageIndexes();
        }

        this.updateUnreadMessages();

        const result = {
            updated: updated.size ? [...updated] : false,
            newUnread,
            deletedUnread,
            newMessages,
            frozenCanceled,
            localMessages,
            localMessagesChanged,
            localDeletedMessages,
            latestMessagesUpdated,
            lastReadChanged: newLastReadMessageIndex > lastReadMessageIndex
        };

        if (DEBUG) {
            Object.assign(result, {
                messages,
                options,
                lastMessageInfoOld: lastMessageInfo,
                lastMessageInfoUpdated: !!(newLastMessage && (!lastMessageInfo || lastMessageInfo.index < newLastMessageIndex)),
                lastMessageInfo,
            });
        }

        return result;
    }

    /**
     * 是否为本地临时会话（没有在服务器注册）
     */
    get isLocal() {
        return !this.id;
    }

    /**
     * 获取此会话的从最近聊天列表移除的状态
     */
    get frozen() {
        return this.$get('freeze');
    }

    /**
     * 设置此会话的从最近聊天列表移除的状态
     * @param flag 是否移除
     */
    set frozen(flag: boolean) {
        this.$set('freeze', flag);
    }

    /**
     * 获取一对一会话对方成员 ID
     */
    get theOtherMemberID() {
        return this.isOne2One ? this.$get('theOtherMemberID') : 0;
    }

    /**
     * 设置一对一会话对方成员 ID
     * @param theOtherMemberID 一对一会话对方成员 ID
     */
    set theOtherMemberID(theOtherMemberID: number) {
        this.$set('theOtherMemberID', theOtherMemberID);
    }

    /**
     * 获取用于数据存储的简单对象
     * @returns 用于的存储对象
     */
    override plain() {
        const {
            id,
            gid,
            type,
            name,
            createdDate,
            createdBy,
            ownedBy,
            editedDate,
            lastActiveTime,
            lastAccessTime,
            dismissDate,
            star,
            mute,
            public: isPublic,
            members,
            pinnedMessages,
            lastMessageInfo,
            lastReadMessageIndex,
            theOtherMemberID,
            localMessages,
        } = this;

        return {
            id,
            gid,
            type,
            name,
            createdDate,
            createdBy,
            ownedBy,
            editedDate,
            lastActiveTime,
            lastAccessTime,
            dismissDate,
            star,
            mute,
            public: isPublic,
            members,
            pinnedMessages,
            committers: this.$get('committers'),
            freeze: this.$get('freeze'),
            delete: this.$get('delete'),
            lastMessageInfo,
            lastReadMessageIndex,
            theOtherMemberID,
            localMessages,
            avatar: Chat.plainAvatar(this.$get('avatar')),
        };
    }
}

if (DEBUG) {
    global.$Chat = Chat;
}
