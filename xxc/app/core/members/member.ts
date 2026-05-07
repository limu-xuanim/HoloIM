import Entity from '../db/entity';
import Schema from '../db/schema';
import Pinyin from '../../utils/pinyin';
import Status from '../../utils/status';
import {matchScore} from '../../utils/search-score';
import Lang from '../lang';
import {createProxyPropertiesMap, createProxyHandler} from '../../utils/proxy-helper';
import {isNotEmptyString} from '../../utils/check-empty';

export type MemberLike = {id: number;}
    & Partial<{
        gid: string;
        account: string;
        email: string;
        phone: string;
        mobile: string;
        realname: string;
        realnames: Record<string, string>;
        site: string;
        avatar: string;
        role: string;
        gender: string;
        dept: number;
        admin: string;
        deleted: boolean;
        weixin: string;
        qq: string;
        address: string;
        status: MemberStatusName;
    }>;

/**
 * 搜索匹配分值表
 */
const MATCH_SCORE_MAP = [
    {name: 'namePinyin', equal: 100, include: 50},
    {name: 'displayName', equal: 100, include: 50},
    {name: 'account', equal: 100, include: 50},
    {name: 'email', equal: 70, include: 30},
    {name: 'phone', equal: 70, include: 30},
    {name: 'site', equal: 50, include: 25},
];

const statusList = {
    unverified: 0, // 未登录
    disconnect: 1, // 登录过，但掉线了
    offline: 1, // 离线
    logged: 2, // 登录成功
    online: 3, // 在线
    busy: 4, // 忙碌
    away: 5, // 离开,
} as const;

export type MemberStatusName = keyof typeof statusList;

type MemberStatusKeeper = import('~/app/utils/status-keeper').StatusKeeper<MemberStatusName>;

/**
 * 成员状态管理器
 */
export const STATUS = new Status<MemberStatusName>(statusList, 0);

export const isMemberOffline = (status: MemberStatusName|number) => STATUS.isLessOrSame(status, STATUS.$.offline);

/**
 * 实体名称
 */
const NAME = 'Member';

/**
 * 数据库存储实体属性结构管理器
 */
const SCHEMA = new Schema({
    id: {type: 'int', indexed: true, primaryKey: true},
    account: {type: 'string', unique: true},
    email: {type: 'string', indexed: true},
    phone: {type: 'string', indexed: true},
    mobile: {type: 'string', indexed: true},
    realname: {type: 'string', indexed: true},
    realnames: {type: 'json'},
    site: {type: 'string'},
    avatar: {type: 'string'},
    role: {type: 'string'},
    gender: {type: 'string'},
    dept: {type: 'int', indexed: true},
    admin: {type: 'string', indexed: true},
    deleted: {type: 'boolean'},
    weixin: {type: 'string'},
    qq: {type: 'string'},
    address: {type: 'string'},
});

/**
 * 代理对象属性定义
 */
const PROXY_PROPERTIES = createProxyPropertiesMap([
    {name: 'gid', deleted: true},
    'account',
    'email',
    'phone',
    'mobile',
    'realname',
    'site',
    'avatar',
    'role',
    'gender',
    'dept',
    'admin',
    'deleted',
    'displayName',
    'namePinyin',
    'weixin',
    'qq',
    'address'
], Entity.PROXY_PROPERTIES);

/**
 * 代理对象拦截处理对象
 */
const PROXY_HANDLER = createProxyHandler(PROXY_PROPERTIES);

/**
 * 成员类
 * @extends {Entity}
 */
export default class Member<T extends MemberLike = MemberLike> extends Entity<T> {
    /**
     * 实体名称
     */
    static override NAME = NAME;

    /**
     * 数据库存储实体属性结构管理器
     */
    static override SCHEMA = SCHEMA;

    /**
     * 代理对象属性定义
     */
    static override PROXY_PROPERTIES = PROXY_PROPERTIES;

    /**
     * 代理对象拦截处理对象
     */
    static override PROXY_HANDLER = PROXY_HANDLER;

    /**
     * 成员状态管理器
     */
    static STATUS = STATUS;

    /**
     * 状态
     */
    protected statusKeeper: MemberStatusKeeper;

    /**
     * 离线之前的状态
     */
    #lastStatusBeforeDisconnect: MemberStatusKeeper;

    /**
     * 拼音名
     */
    #namePinyin: string;

    /**
     * 会话 GID
     */
    public cgid: string;

    /**
     * 是否过期
     */
    public expired: boolean;

    /**
     * 上次访问时间
     */
    public lastAccessTime: number;

    /**
     * 创建一个成员类实例
     * @param data 成员属性对象
     * @param entityType 实体类型名称
     */
    constructor(data: T, entityType = NAME) {
        super(data, entityType);
        /**
         * 成员状态
         */
        this.statusKeeper = STATUS.create(this.$.status);
    }

    /**
     * 获取此实例对应类上的代理对象处理对象
     * @returns 代理对象处理定义对象
     */
    override get proxyHandler() {
        return PROXY_HANDLER;
    }

    /**
     * 获取数据库存储实体属性结构管理器
     */
    override get schema() {
        return SCHEMA;
    }

    /**
     * 获取是否已经删除
     */
    get isDeleted() {
        return this.$get('deleted');
    }

    /**
     * 获取状态值
     */
    get status(): number {
        return this.statusKeeper.value;
    }

    /**
     * 设置成员状态
     */
    set status(newStatus: MemberStatusName|number) {
        this.statusKeeper.change(newStatus);
    }

    /**
     * 获取离线之前的状态值
     */
    get lastStatusBeforeDisconnect() {
        return this.#lastStatusBeforeDisconnect;
    }

    /**
     * 设置离线之前的状态值
     * @param stus 成员状态值或名称
     */
    setLastStatusBeforeDisconnect(stus: MemberStatusName|number) {
        this.#lastStatusBeforeDisconnect = STATUS.create(stus);
    }

    /**
     * 获取状态名称
     */
    get statusName() {
        return this.statusKeeper.name;
    }

    /**
     * 获取是否状态为在线
     */
    get isOnline() {
        return (this.status as number) >= STATUS.$.logged;
    }

    /**
     * 获取是否状态是否为离线
     */
    get isOffline() {
        return !this.isOnline;
    }

    /**
     * 获取是否状态是否为忙碌
     */
    get isBusy() {
        return this.statusKeeper.is(STATUS.$.busy);
    }

    /**
     * 判定当前用户是否处于离开状态
     */
    get isAway() {
        return this.isStatus(STATUS.$.away);
    }

    /**
     * 判断当前状态是否是给定的状态
     * @param status 要判断的状态值或状态名称
     * @returns 如果为 `true` 则为给定的状态，否则不是
     */
    isStatus(status: MemberStatusName|number): boolean {
        return this.statusKeeper.is(status);
    }

    /**
     * 判断成员账号是否为给定的值
     * @param account 要判断的用户名
     * @returns 如果为 `true` 则为给定的值，否则不是
     */
    isMember(account: string): boolean {
        return this.account === account;
    }

    /**
     * 获取性别
     */
    get gender() {
        return this.$get('gender');
    }

    /**
     * 获取部门编号
     */
    get dept() {
        return this.$get('dept');
    }

    /**
     * 获取是否为超级管理员
     */
    get isSuperAdmin() {
        return this.$get('admin') === 'super';
    }

    /**
     * 获取是否为管理员
     */
    get isAdmin() {
        return this.admin !== 'no';
    }

    get admin() {
        return this.$get('admin');
    }

    /**
     * 获取用户真实姓名的多语言配置
     */
    get realnames() {
        return this.$get('realnames');
    }

    /**
     * 获取用户用户真实姓名
     */
    get realname() {
        const {realnames} = this;
        if (realnames) {
            if (realnames.cn && !realnames['zh-cn']) {
                realnames['zh-cn'] = realnames.cn;
            }
            if (realnames.tw && !realnames['zh-tw']) {
                realnames['zh-tw'] = realnames.tw;
            }
            const realname = realnames[Lang.name];
            if (realname) {
                return realname;
            }
        }
        return this.$get('realname');
    }

    /**
     * 设置用户真实姓名
     * @param realname 用户真实姓名
     */
    set realname(realname: string) {
        this.$set('realname', realname);
    }

    /**
     * 获取用户账号
     */
    get account() {
        return this.$get('account');
    }

    /**
     * 获取用户头像图片地址
     */
    get avatar() {
        return this.$get('avatar');
    }

    /**
     * 获取用户电话号码
     */
    get phone() {
        return this.$get('phone');
    }

    /**
     * 获取用户移动电话
     */
    get mobile() {
        return this.$get('mobile');
    }

    /**
     * 获取用户电子邮件地址
     */
    get email() {
        return this.$get('email');
    }

    /**
     * 获取用户角色代号
     */
    get role() {
        return this.$get('role');
    }

    /**
     * 获取显示名称
     */
    get displayName(): string {
        let name = this.$get('realname');
        if (!name) {
            name = `${this.account}`;
        }
        return name;
    }

    /**
     * 获取 @ 此用户时的最佳可读文本
     */
    get mentionText() {
        const {realname} = this;
        if (isNotEmptyString(realname)) {
            return `@${realname}`;
        }
        const {account} = this;
        if (isNotEmptyString(account)) {
            return `@${account}`;
        }
        return `@#${this.id}`;
    }

    /**
     * 获取用户显示名称的拼音字符串（通常用于检索和排序）
     */
    get namePinyin() {
        this.#namePinyin ??= Pinyin(this.displayName);
        return this.#namePinyin;
    }

    /**
     * 获取用户微信
     */
    get weixin() {
        return this.$get('weixin');
    }

    /**
     * 获取用户qq
     */
    get qq() {
        return this.$get('qq');
    }

    /**
     * 获取用户通讯地址
     */
    get address() {
        return this.$get('address');
    }

    get site() {
        return this.$get('site');
    }

    /**
     * 获取成员与给定的关键字匹配分值
     * @param keys 关键字列表
     * @returns 匹配的分值
     */
    getMatchScore(keys: string[]): number {
        return matchScore(MATCH_SCORE_MAP, this, keys);
    }

    /**
     * 获取用于存储的简单对象
     */
    override plain() {
        const {
            id,
            gid,
            account,
            email,
            phone,
            mobile,
            realnames,
            avatar,
            role,
            gender,
            dept,
            site,
            realname,
            admin,
            isDeleted: deleted
        } = this;

        return {
            id,
            gid,
            account,
            email,
            phone,
            mobile,
            realnames,
            avatar,
            role,
            gender,
            dept,
            site,
            realname,
            deleted,
            admin,
        };
    }

    toPlain() {
        const {id, displayName, avatar} = this;
        return {
            id,
            displayName,
            avatar,
        };
    }
}

if (DEBUG) {
    global.$Member = Member;
}
