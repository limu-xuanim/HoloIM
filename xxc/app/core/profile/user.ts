import Md5 from 'md5';
import {extractPortFromUrl} from '~/app/utils/string-helper';
import DelayAction from '~/app/utils/delay-action';
import {isSameDay, isToday, TIME_DAY} from '~/app/utils/date-helper';
import {createProxyHandler, createProxyPropertiesMap} from '~/app/utils/proxy-helper';
import Member from '../members/member';
import UserConfig from './user-config';
import {saveUserToStore} from './user-store';
import {Subject} from 'rxjs';
import {updateUserInfoOnTray} from '../notice';
import type {VersionSupport} from '~/app/core/server/feature-versions';
import type {MappingScheme} from '~/app/utils/json-optimizer';
import type {DeptItem} from '../members/depts-store';
import type {MemberLike} from '../members/member';
import type {AllUserConfig} from './user-config';
import type {MemberStatusName} from '~/app/core/members/member';

type MemberStatusKeeper = import('~/app/utils/status-keeper').StatusKeeper<MemberStatusName>;

/** 用户密码 MD5 存储前缀 */
export const AUTH_PASSWORD_FLAG = '%%%PWD_FLAG%%% ';

/** 用户 token MD5 存储前缀 */
export const AUTH_TOKEN_FLAG = '%%%TOKEN_FLAG%%% ';

/** 默认端口 */
const DEFAULT_PORT = '11443';

const userStatusChangeSubject = new Subject<[MemberStatusKeeper, MemberStatusKeeper, User]>();

const userConfigChangeSubject = new Subject<[Partial<AllUserConfig>, UserConfig, User]>();

const userConfigRequestUploadSubject = new Subject<[Partial<AllUserConfig>, UserConfig, User]>();

/**
 * 绑定用户状态变更事件
 * @param listener 事件回调函数
 * @returns subscription
 */
export const onUserStatusChange = (listener: (next: [MemberStatusKeeper, MemberStatusKeeper, User]) => void) => userStatusChangeSubject.subscribe(listener);

/**
 * 绑定用户配置变更事件
 * @param listener 事件回调函数
 * @returns subscription
 */
export const onUserConfigChange = (listener: (next: [Partial<AllUserConfig>, UserConfig, User]) => void) => userConfigChangeSubject.subscribe(listener);

/**
 * 绑定用户配置请求上传事件
 * @param listener 事件回调函数
 * @returns subscription
 */
export const onUserConfigRequestUpload = (listener: (next: [Partial<AllUserConfig>, UserConfig, User]) => void) => userConfigRequestUploadSubject.subscribe(listener);

/**
 * 获取用户登录验证字符串类型和值，类型可能为 'token' 和 'password'，值为去掉前缀的部分
 * @param authKey 登录验证字符
 * @returns 类型和值组成的对象
 */
const getAuthKeyInfo = (authKey: string) => {
    let type: 'token'|'password';
    let key: string;
    if (typeof authKey !== 'string' || !authKey.length) {
        type = 'password';
        key = '';
    } else if (authKey.startsWith(AUTH_TOKEN_FLAG)) {
        type = 'token';
        key = authKey.substring(AUTH_TOKEN_FLAG.length);
    } else if (authKey.startsWith(AUTH_PASSWORD_FLAG)) {
        type = 'password';
        key = authKey.substring(AUTH_PASSWORD_FLAG.length);
    } else if (authKey.length === 64) {
        type = 'token';
        key = authKey;
    } else if (authKey.length === 32) {
        type = 'password';
        key = authKey;
    } else {
        type = 'password';
        key = Md5(authKey);
    }
    return {type, key};
};

/**
 * 检查用户登录的服务器版本支持情况
 * @param user 当前用户
 * @returns 返回一个功能支持情况表
 */
const checkVersionSupport = (user: User) => ({
    fileServer: user.uploadFileSize !== 0,
}) as const;

export type UserLike = MemberLike & Partial<{
    lastLoginTime: number;
    config: Record<string, any>;
    authKey: string,
    authTokenLifetime: number;
    tokenAuthWindow: number;
    token: string;
    cipherIV: string;
    server: string;
    serverVersion: string;
    uploadFileSize: number;
    autoLogin: boolean;
    rememberMe: boolean;
    signed: number;
    admin: string;
    password: string;
    generatedTimeOfToken: number;
    company: string;
    permissions: string[];
    dismissedGroupLife: number;
    apiScheme: MappingScheme;
    deptsCache: Record<`${number}`, DeptItem>;
    rolesCache: Record<string, string>;
    serverTimeOffset: number;
    backendURL: string;
    requestType: string;
    requestFix: string;
    stunPort: `${number}`;
    iceServers: string;
}>;

const NAME = 'USER';

/**
 * 用户类
 */
export default class User extends Member<UserLike> {
    /** 实体名称 */
    static override NAME = NAME;

    /** 数据库存储实体属性结构管理器 */
    static override SCHEMA = Member.SCHEMA.extend({
        lastLoginTime: {type: 'timestamp'},
        config: {type: 'object', defaultValue: {}},
        authKey: {type: 'string'},
        authTokenLifetime: {type: 'int'},
        tokenAuthWindow: {type: 'int'},
        token: {type: 'string'},
        cipherIV: {type: 'string'},
        server: {type: 'string'},
        serverVersion: {type: 'string'},
        uploadFileSize: {type: 'int'},
        autoLogin: {type: 'boolean', default: false},
        rememberMe: {type: 'boolean', default: true},
        signed: {
            type: 'timestamp',
            setter: (time, obj) => {
                const lastSignedTime = (obj as User).signed;
                (obj as User).isFirstSignedToday = time && isToday(time) && (!lastSignedTime || !isSameDay(time, lastSignedTime));
                return time;
            }
        },
        admin: {type: 'string', default: ''}
    });

    /** 代理对象属性定义 */
    static override PROXY_PROPERTIES = createProxyPropertiesMap([
        'lastLoginTime',
        'server',
        'serverVersion',
        'uploadFileSize',
        'signed',
        'backendType',
        'serverNowTime',
        'authToken',
    ], Member.PROXY_PROPERTIES);

    /** 代理对象拦截处理对象 */
    static override PROXY_HANDLER = createProxyHandler(User.PROXY_PROPERTIES);

    /** 用户状态管理器 */
    static override STATUS = Member.STATUS;

    /** 用户保存延迟操作管理器 */
    private saveUserAction: DelayAction<() => void>;

    /** 事件机制是否可用 */
    private eventsEnable: boolean;

    private statusChangeCallTimer: NodeJS.Timeout;

    /** 用户配置 */
    #config: UserConfig;

    /** 是否正在登录中状态 */
    #isLogging: boolean|'simple';

    /** token 是否需要更新 */
    tokenNeedRenew: boolean;

    /** 用户可用的 Session ID */
    sessionID: string;

    /** 服务器 URL */
    #server: URL;

    /** 服务器端口 */
    #serverPort: string;

    /** 获取后端服务器类型 */
    backendType: string;

    /** Socket 服务器端口 */
    socketPort: string;

    /** Socket 服务器连接地址 */
    #socketUrl: string;

    /** 服务器版本 */
    #serverVersion: string;

    _clientUpdate: { version: string; readme: string; strategy: string; downloads: any; };

    /** 是否开启客户端 aes */
    enableClientAES: boolean;

    /** 判定用户是否在今天第一次进行登录 */
    isFirstSignedToday: boolean;

    /** 支持的特定功能 */
    private versionSupport: { [K in VersionSupport]: boolean } | null = null;

    loginError: Error;

    password: string;

    /**
     * 创建一个用户类实例
     * @param data 属性对象
     */
    constructor(data: UserLike) {
        super(data, NAME);
        this.saveUserAction = new DelayAction(() => {
            saveUserToStore(this);
        });
        this.eventsEnable = false;

        this.statusKeeper.onChange = (_, oldStatus) => {
            if (this.isEventsEnable) {
                userStatusChangeSubject.next([this.statusKeeper.proxy, Member.STATUS.create(oldStatus).proxy, this])
            }

            clearTimeout(this.statusChangeCallTimer);
            if (this.statusKeeper.is(Member.STATUS.$.logged)) {
                this.$set('lastLoginTime', Date.now());
                this.statusChangeCallTimer = setTimeout(() => {
                    if (this.isStatus(Member.STATUS.$.logged)) {
                        this.status = Member.STATUS.$.online;
                    }
                }, 1000);
            }
        };
    }

    /**
     * 获取此实例对应类上的代理对象处理对象
     */
    override get proxyHandler() {
        return User.PROXY_HANDLER;
    }

    /**
     * 获取用户类数据库存储实体属性结构管理器
     */
    override get schema() {
        return User.SCHEMA;
    }

    /**
     * 判定当前用户事件机制是否可用
     */
    get isEventsEnable(): boolean {
        return this.eventsEnable;
    }

    /**
     * 将当前用户事件机制标记为可用
     */
    enableEvents() {
        this.eventsEnable = true;
    }

    /**
     * 销毁当前用户实例，并将当前用户事件机制标记为不可用
     */
    destroy() {
        this.eventsEnable = false;
    }

    /**
     * 获取当前用户实例存储数据对象
     * @returns 数据对象
     */
    override plain() {
        const userData = {...super.plain(), ...this.$, config: this.config.plain()};
        if (userData.password) {
            const obsoleteProps = ['password', 'ranzhiUrl'] as const;
            for (const propName of obsoleteProps) {
                if (userData[propName] !== undefined) {
                    delete userData[propName];
                }
            }
        }

        const {server} = this;
        if (server.port === DEFAULT_PORT) {
            server.port = '';
            userData.server = server.toString();
            server.port = DEFAULT_PORT;
        }

        if (this.#serverPort) { // 如果指定了端口号，则使用指定的端口号
            userData.server = `${server.protocol}//${server.username || server.password ? `${server.username}:${server.password}@` : ''}${server.hostname}:${this.#serverPort}${server.pathname}${server.search}`;
        }

        return userData;
    }

    /**
     * 将用户保存到本地存储
     */
    save() {
        this.saveUserAction.do();
    }

    /**
     * 用户上次登录时间
     */
    get signed() {
        return this.$get('signed');
    }

    /**
     * 设置用户上次登录时间
     */
    set signed(time: number) {
        this.$set('signed', time);
    }

    /**
     * 获取用户个人配置数据
     */
    get config(): UserConfig {
        if (!this.#config) {
            this.#config = new UserConfig(this.$get('config'));
            this.#config.onChange = (changes, config) => {
                // Save user to config file
                this.save();

                // Emit user config change event
                if (this.isEventsEnable) {
                    userConfigChangeSubject.next([changes, config, this])
                }
            };

            this.#config.onRequestUpload = (changes, config) => {
                // Emit user config change event
                if (this.isEventsEnable && this.isOnline) {
                    userConfigRequestUploadSubject.next([changes, config, this])
                }
            };
        }
        return this.#config;
    }

    /**
     * 判断用户状态是否处于离线状态
     * @returns 如果为 `true` 则表示用户处于离线状态，否则为为通过验证或在线状态
     */
    get isDisconnect() {
        return this.statusKeeper.is(Member.STATUS.$.disconnect);
    }

    /**
     * 判断用户状态是否处于未通过验证状态，需要输入密码进行登录
     * @returns 如果为 `true` 则表示用户处于未通过验证状态
     */
    get isUnverified() {
        return this.status <= Member.STATUS.$.unverified;
    }

    /**
     * 判断用户状态是否处于已通过验证状态
     */
    get isVerified() {
        return this.status >= Member.STATUS.$.disconnect;
    }

    /**
     * 判断用户状态是否处于已登录状态
     */
    get isLogged() {
        return this.status >= Member.STATUS.$.logged;
    }

    /**
     * 将用户登录状态设置为离线状态
     */
    markDisconnect() {
        this.status = Member.STATUS.$.disconnect;
    }

    /**
     * 将用户登录状态设置为未通过验证状态
     */
    markUnverified() {
        this.status = Member.STATUS.$.unverified;
    }

    /**
     * 判断用户状态是否处于正在登录中状态
     */
    get isLogging() {
        return !!this.#isLogging;
    }

    /**
     * 标记用户正在开始登录操作
     * @param simple 是否为简单登录模式
     */
    beginLogin(simple: boolean) {
        if (this.isOnline) {
            this.status = Member.STATUS.$.unverified;
        }
        this.#isLogging = simple ? 'simple' : true;
    }

    /**
     * 标记用户已结束登录操作
     * @param result 是否登录成功
     * @param isIdentifyFailed 是否为验证失败错误
     */
    endLogin(result: boolean|string, isIdentifyFailed: boolean) {
        this.#isLogging = false;
        if (result) {
            if (this.isOffline) {
                this.status = Member.STATUS.$.logged;
            }
        } else if (isIdentifyFailed || !this.isDisconnect) {
            this.status = Member.STATUS.$.unverified;
            if (isIdentifyFailed) {
                this.clearAuthToken();
            }
        }
    }

    /**
     * token 有效期（单位：天）
     */
    get authTokenLifetime() {
        return this.$get('authTokenLifetime', 0);
    }

    /**
     * 用户验证凭据（已添加凭据类型前缀，可能为密码或验证 Token）
     */
    get authKey() {
        let authKey = this.$get('authKey');
        if (authKey === undefined) {
            authKey = this.$get('password', '');
        }
        return authKey;
    }

    /**
     * 设置用户登录验证字符串
     */
    set authKey(key: string) {
        const info = getAuthKeyInfo(key);
        if (info.type === 'token') {
            this.setAuthToken(info.key);
        } else {
            this.setPassword(info.key);
        }
    }

    /**
     * 获取用户登录验证字符串类型和值，类型可能为 'token' 和 'password'，值为去掉前缀的部分
     */
    get authKeyInfo() {
        return getAuthKeyInfo(this.authKey);
    }

    /**
     * 获取是否设置为记住当前登录验证凭据
     */
    get rememberMe(): boolean {
        const rememberMe = this.$get('rememberMe');
        return !!rememberMe;
    }

    /**
     * 设置是否记住登录验证凭据字符串
     */
    set rememberMe(rememberMe: boolean) {
        this.$set('rememberMe', !!rememberMe);
    }

    /**
     * 设置验证 Token 信息
     * @param authToken 验证 Token 字符串
     */
    setAuthToken(authToken: string) {
        if (!authToken) {
            return;
        }

        if (!authToken.startsWith(AUTH_TOKEN_FLAG)) {
            authToken = `${AUTH_TOKEN_FLAG}${authToken}`;
        }
        this.$set('authKey', authToken);
        this.$set('generatedTimeOfToken', Date.now());
    }

    /**
     * 清除验证 Token 信息
     */
    clearAuthToken() {
        this.$set('authKey', '');
        this.$set('generatedTimeOfToken', 0);
    }

    /**
     * 设置验证 Token 配置
     * @param lifetime Token 有效期（单位天）
     * @param authWindow Token 验证窗口时间（单位）
     */
    setAuthTokenConfig(lifetime: number, authWindow: number) {
        if (typeof lifetime === 'number') {
            this.$set('authTokenLifetime', lifetime);
        }
        if (typeof authWindow === 'number') {
            this.$set('tokenAuthWindow', authWindow);
        }
    }

    /**
     * 是否需要续期验证 Token
     */
    get isAuthTokenNeedRenew(): boolean {
        if (!this.hasAuthToken) {
            return false;
        }
        const {generatedTimeOfToken} = this;
        return this.tokenNeedRenew || !generatedTimeOfToken
        || (Date.now() - generatedTimeOfToken) > ((this.authTokenLifetime * TIME_DAY * 2) / 3);
    }

    /**
     * 当前用户是否使用验证 Token 进行登录
     */
    get hasAuthToken() {
        return this.authKeyInfo.type === 'token';
    }

    /**
     * 获取验证 Token
     */
    get authToken() {
        const {authKeyInfo} = this;
        return authKeyInfo.type === 'token' ? authKeyInfo.key : '';
    }

    /**
     * 设置用户验证密码
     */
    setPassword(password: string) {
        if (!password.startsWith(AUTH_PASSWORD_FLAG)) {
            if (password.length !== 32) {
                password = Md5(password);
            }

            // 确保存储为 authKey 时增加了类型前缀
            password = `${AUTH_PASSWORD_FLAG}${password}`;
        }
        this.$set('authKey', password);
    }

    /**
     * 获取用户用于验证的 cookie 信息
     */
    get sidCookieInfo() {
        return {
            url: this.server.origin,
            name: `sid-${this.id}`,
            value: Md5(`${this.id}:${this.sessionID}`),
            path: '/'
        };
    }

    /**
     * 获取用户用于验证的 cookie 信息
     */
    get sidCookieInfoWithoutUserId() {
        return {
            url: this.server.origin,
            name: 'sid',
            value: Md5(`${this.id}:${this.sessionID}`),
            path: '/'
        };
    }

    /**
     * 获取用户登录的服务器地址（以 URL 实例形式）
     */
    get server(): URL {
        if (!this.#server) {
            this.setServer(this.$get('server'));
        }
        return this.#server;
    }

    /**
     * 设置用户登录的服务器地址
     * @param server 服务器地址
     */
    setServer(server: string) {
        if (!server) {
            return;
        }

        const port = extractPortFromUrl(server);

        server = User.simplifyServerUrl(server);
        const url = new URL(server);
        if (!url.port && !port) { // 未指定端口号，或是喧喧默认端口号
            url.port = DEFAULT_PORT;
        }

        let serverUrl = url.toString();
        if (port) { // 如果指定了端口号，则使用指定的端口号
            serverUrl = `${url.protocol}//${url.username || url.password ? `${url.username}:${url.password}@` : ''}${url.hostname}:${port}${url.pathname}${url.search}`;
        }

        this.$set('server', serverUrl);
        this.#server = url;
        this.#serverPort = port;
    }

    /**
     * 获取用户登录的服务器地址（以字符串形式）
     */
    get serverUrl() {
        return this.$get('server') || '';
    }

    /**
     * 获取 XXD 服务器端口号
     */
    get webServerPort() {
        const {server} = this;
        return server ? this.#serverPort || server.port : '';
    }

    /**
     * 获取要登录的 XXD 服务器名称
     */
    get serverName(): string {
        const {server} = this;
        if (server) {

            return server.username ? server.username : (server.pathname ? server.pathname.substr(1) : '');
        }
        return '';
    }

    /**
     * 获取请求 XXD 服务器信息 URL 地址
     */
    get webServerInfoUrl() {
        const {server} = this;
        return server ? this.#serverPort ? `${server.protocol}//${server.hostname}:${this.#serverPort}/serverInfo${server.search}` : `${server.origin}/serverInfo` : '';
    }

    /**
     * 获取可能的请求 XXD 服务器信息 URL 地址
     */
    get possibleServerInfoUrls() {
        const {server} = this;
        const urls = [this.webServerInfoUrl];
        if (this.isVerified) { // 重连时只返回已知可用的服务器地址
            return urls;
        }
        const pathname = `${server.pathname}${server.pathname.endsWith('/') ? '' : '/'}serverInfo`;
        urls.push(`${server.protocol === 'https:' ? 'http:' : 'https:'}//${server.host}${pathname}`);
        if (server.port !== DEFAULT_PORT) {
            urls.push(`https://${server.hostname}:11443${pathname}`);
            urls.push(`http://${server.hostname}:11443${pathname}`);
        } else {
            urls.push(`${server.protocol}//${server.hostname}${pathname}`);
        }
        return urls;
    }

    /**
     * 获取 Socket 服务连接地址
     */
    get socketUrl() {
        if (this.#socketUrl) {
            return this.#socketUrl;
        }
        const {serverUrl} = this;
        if (serverUrl) {
            const url = new URL(serverUrl);
            url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            url.pathname = '/ws';
            url.port = this.socketPort;
            return url.toString();
        }
        return '';
    }

    /**
     * 设置Socket 服务器连接地址
     */
    set socketUrl(url: string) {
        this.#socketUrl = url;
    }

    /**
     * 获取服务器版本
     */
    get serverVersion() {
        return this.#serverVersion;
    }

    /**
     * 设置服务器版本号
     */
    set serverVersion(version: string) {
        version = version.toLowerCase();
        if (version[0] === 'v') {
            version = version.substring(1);
        }
        this.#serverVersion = version;
    }

    /**
     * 获取服务器上的客户端版本信息
     */
    get clientUpdate() {
        return this._clientUpdate;
    }

    /**
     * 获取服务器上的客户端版本信息
     */
    set clientUpdate(clientUpdate: {version: string; readme: string; strategy: string; downloads: any;}) {
        this._clientUpdate = clientUpdate;
    }

    /**
     * 获取服务器地址根路径
     */
    get serverUrlRoot() {
        const {serverUrl} = this;
        let urlRoot = '';
        if (serverUrl) {
            const url = new URL(serverUrl);
            url.hash = '';
            url.search = '';
            url.pathname = '';
            urlRoot = url.toString();
        }
        if (urlRoot && !urlRoot.endsWith('/')) {
            urlRoot += '/';
        }
        return urlRoot;
    }

    /**
     * 拼接 http 服务器请求地址
     * @param path 请求路径
     */
    makeServerUrl(path = ''): string {
        if (path && path.startsWith('/')) {
            path = path.substring(1);
        }
        return this.serverUrlRoot + path;
    }

    /**
     * 获取上传文件请求地址
     */
    get uploadUrl() {
        return this.makeServerUrl('fileUpload');
    }

    /**
     * 获取用户标识字符串
     */
    get identify() {
        const {server} = this;
        if (!server) {
            return '';
        }
        return User.createIdentify(server, this.account);
    }

    /**
     * 获取公司名称
     */
    get company() {
        return this.$get('company');
    }

    /**
     * 设置公司名称
     */
    set company(newCompany: string) {
        this.$set('company', newCompany);
    }

    /**
     * 获取 Socket 加密 Token 字符串
     */
    get token() {
        return this.$get('token');
    }

    /**
     * 设置 Socket 加密 Token 字符串
     */
    set token(token: string) {
        this.$set('token', token);
    }

    /**
     * 获取用户权限清单
     */
    get permissions() {
        return this.$get('permissions') || [];
    }

    /**
     * 设置 获取用户权限清单
     * @param permissions  获取用户权限清单
     */
    set permissions(permissions: string|string[]) {
        if (typeof permissions === 'string') {
            permissions = permissions.split(',');
            permissions = permissions.filter(x => x);
        }
        this.$set('permissions', permissions);
    }

    /**
     * 保持已解散的讨论组可见的时间（单位：天）
     */
    get dismissedGroupLife() {
        return this.$get('dismissedGroupLife', 90);
    }

    /**
     * 设置保持已解散的讨论组可见的时间（单位：天）
     */
    set dismissedGroupLife(dismissedGroupLife: number) {
        this.$set('dismissedGroupLife', dismissedGroupLife);
    }

    /**
     * 获取本地 API 数据定义映射表
     */
    get apiScheme() {
        return this.$get('apiScheme');
    }

    /**
     * 设置本地 API 数据定义映射表
     */
    set apiScheme(mappingSchema: MappingScheme) {
        this.$set('apiScheme', mappingSchema);
    }

    /**
     * 部门缓存数据
     */
    get deptsCache() {
        return this.$get('deptsCache');
    }

    /**
     * 设置部门缓存数据
     * @param depts 部门缓存数据
     */
    set deptsCache(depts: Record<`${number}`, DeptItem>) {
        this.$set('deptsCache', depts);
    }

    /**
     * 角色缓存数据
     */
    get rolesCache() {
        return this.$get('rolesCache');
    }

    /**
     * 设置角色缓存数据
     * @param roles 角色缓存数据
     */
    set rolesCache(roles: Record<string, string>) {
        this.$set('rolesCache', roles);
    }

    /**
     * 获取本地 API 数据定义映射表版本
     */
    get apiVersion() {
        const {apiScheme} = this;
        return (apiScheme && apiScheme.$version) || '';
    }

    /**
     * 获取是否拥有 API 数据定义映射表
     */
    get hasApiScheme() {
        return !!this.apiScheme;
    }

    /**
     * 获取 Socket 服务 AES 加密向量
     */
    get cipherIV() {
        return this.token.substring(0, 16);
    }

    /**
     * 设置 Socket 服务 AES 加密向量
     */
    set cipherIV(cipherIV: string) {
        this.$set('cipherIV', cipherIV);
    }

    /**
     * 获取最大允许文件上传大小
     */
    get uploadFileSize() {
        return this.$get('uploadFileSize');
    }

    /**
     * 设置最大允许文件上传大小
     */
    set uploadFileSize(uploadFileSize: number) {
        this.$set('uploadFileSize', uploadFileSize);
    }

    /**
     * 获取上次登录的时间戳
     */
    get lastLoginTime() {
        return this.$get('lastLoginTime');
    }

    /**
     * 获取服务器时间差（毫秒）
     */
    get serverTimeOffset() {
        return this.$get('serverTimeOffset', 0);
    }

    /**
     * 设置服务器时间差（毫秒）
     */
    set serverTimeOffset(offset: number) {
        this.$set('serverTimeOffset', offset);
    }

    /**
     * 获取预估的服务器当前时间
     */
    get serverNowTime() {
        const {serverTimeOffset} = this;
        if (serverTimeOffset) {
            return new Date(Date.now() + serverTimeOffset);
        }
        return new Date();
    }

    /**
     * 获取后端服务器地址
     */
    get backendURL() {
        return this.$get('backendURL');
    }

    /**
     * 设置后端服务器地址
     */
    set backendURL(backendURL: string) {
        this.$set('backendURL', backendURL);
    }

    /**
     * 获取请求类型
     */
    get requestType() {
        return this.$get('requestType');
    }

    /**
     * 设置请求类型
     */
    set requestType(requestType: string) {
        this.$set('requestType', requestType);
    }

    /**
     * 获取请求分隔符
     */
    get requestFix() {
        return this.$get('requestFix');
    }

    /**
     * 设置请求分隔符
     */
    set requestFix(requestFix: string) {
        this.$set('requestFix', requestFix);
    }

    /**
     * 获取是否已设置为自动登录
     */
    get autoLogin() {
        return this.$get('autoLogin');
    }

    /**
     * 设置是否已设置为自动登录
     */
    set autoLogin(autoLogin: boolean) {
        this.$set('autoLogin', autoLogin);
    }

    /**
     * 获取用户头像图片地址
     */
    override get avatar() {
        let avatar = this.$get('avatar');
        if (avatar) {
            if (!avatar.startsWith('https://') && !avatar.startsWith('http://')) {
                avatar = this.serverUrlRoot + avatar;
            }
        }
        return avatar;
    }

    /**
     * 设置用户头像图片地址
     */
    override set avatar(newAvatar: string) {
        this.$set('avatar', newAvatar);
    }

    /**
     * 获取是否从没有成功登录过
     */
    get isNeverLogged(): boolean {
        return !this.lastLoginTime;
    }

    /**
     * 获取 Token 验证窗口时间(秒)
     */
    get tokenAuthWindow(): number {
        return this.$get('tokenAuthWindow') || 20;
    }

    /**
     * 获取 token 生成时间
     */
    get generatedTimeOfToken(): number {
        return this.$get('generatedTimeOfToken', 0);
    }

    /**
     * 获取用于随接口发送的登录验证的密码
     */
    get authKeyForServer(): string {
        const {key, type} = this.authKeyInfo;
        if (type === 'token') {
            const {account, serverNowTime, tokenAuthWindow} = this;
            let authToken = key;
            if (authToken.length === 64) {
                authToken = Md5(`${account}${key}${Math.round(serverNowTime.getTime() / 1000 / tokenAuthWindow)}`);
            } else if (authToken.length >= 32) {
                authToken = authToken.substring(0, 32);
            }
            authToken = `${authToken}${Md5(authToken)}`;
            return authToken;
        }
        return key;
    }

    /**
     * stun 端口
     */
    get stunPort() {
        return this.$get('stunPort', '3478');
    }

    /**
     * 设置 stun 端口
     */
    set stunPort(port: `${number}`) {
        this.$set('stunPort', port);
    }

    /**
     * 获取 ice 服务器
     */
    get iceServers() {
        return this.$get('iceServers', '');
    }

    /**
     * 设置 ice 服务器
     * @param servers, 服务器（,为分隔符）
     */
    set iceServers(servers: string) {
        this.$set('iceServers', servers);
    }

    /**
     * 获取用户Admin类型
     */
    override get admin(): string {
        return this.$get('admin', '');
    }

    /**
     * 检查当前版本是否支持特定功能
     * @param name 功能名称
     * @returns 如果返回 `true` 则为支持
     */
    isVersionSupport(name: VersionSupport): boolean {
        return Boolean(this.versionSupport?.[name]);
    }

    /**
     * 设置当前服务器版本支持的功能表
     * @param flags 支持的功能表
     */
    setVersionSupport() {
        this.versionSupport = checkVersionSupport(this);
    }

    /**
     * 从成员对象更新用户信息
     * @param member 成员对象
     */
    updateFromMember(member: Member) {
        if (member.account !== this.account) {
            return;
        }
        this.realname = member.realname;
        this.avatar = member.avatar;
        this.status = member.status;
    }

    /**
     * 创建一个用户实例
     * @static
     * @param user 用户数据对象
     * @returns 用户实例
     */
    static create(user: User|UserLike): User {
        if (user instanceof User) {
            return user;
        }
        return new User(user);
    }

    /**
     * 创建用户唯一识别标识字符串
     * @static
     * @param server 用户登录的服务器地址
     * @param account 用户账号
     * @returns 用户唯一识别标识字符串
     */
    static createIdentify(server: string|URL, account: string) {
        let port: string;
        if (!(server instanceof URL)) {
            if (!server.startsWith('https://') && !server.startsWith('http://')) {
                server = `https://${server}`;
            }
            port = extractPortFromUrl(server);
            server = new URL(server);
        }
        if (!server.port) {
            server.port = DEFAULT_PORT;
        }
        let {pathname} = server;
        if (pathname?.length) {
            if (pathname === '/') {
                pathname = '';
            }
            pathname = pathname.replace(/\//g, '_');
        }
        const hostname = `${server.hostname}__${port || server.port}`;
        return `${account}@${hostname}${pathname}`;
    }

    /**
    * 将服务器地址转换为简单形式
    * @param serverUrl 服务器地址
    * @returns 服务器地址
    */
    static simplifyServerUrl(serverUrl: string): string {
        if (serverUrl) {
            if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
                serverUrl = `https://${serverUrl}`;
            }
            try {
                const port = extractPortFromUrl(serverUrl);

                const simpleServer = new URL(serverUrl);
                if (simpleServer.port === DEFAULT_PORT) {
                    simpleServer.port = '';
                    serverUrl = simpleServer.toString();
                } else if (!simpleServer.port && port) { // 处理强制指定为协议默认端口的情况
                    serverUrl = `${simpleServer.protocol}//${simpleServer.username || simpleServer.password ? `${simpleServer.username}:${simpleServer.password}@` : ''}${simpleServer.hostname}:${port}${simpleServer.pathname}${simpleServer.search}`;
                }
            } catch (e) {
                if (DEBUG) {
                    console.error('Cannot parse url ', serverUrl, e);
                }
            }
        }
        return serverUrl;
    }
}

if (DEBUG) {
    global.$User = User;
}

// 当用户状态变更时更新托盘图标上的文本 若为离线状态则去auto-reconnect-bar控件触发
onUserStatusChange(([_1, _2, changedUser]) => {
    updateUserInfoOnTray(changedUser);
});
