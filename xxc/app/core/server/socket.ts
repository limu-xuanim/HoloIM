import md5 from 'md5';
import SocketMessage from './socket-message';
import Config from '~/app/config';
import {decodeSocketMessage, encodeSocketMessage} from './server-api-optimization';
import CodedError, {Codes} from '~/app/utils/coded-error';
import Socket from '~/app/platform/common/socket';
import {Subject} from 'rxjs';
import type {SocketMessageLike} from './socket-message';

/**
 * 定期向服务器发送 ping 的时间
 */
const PING_INTERVAL = 60 * 1000;

/**
 * ping 响应超时时间
 */
const PING_TIMEOUT = PING_INTERVAL * 2;

const socketMsSubject = new Subject<[SocketMessage, any, CodedError]>();

/**
 * 根据消耗时间返回一个颜色值，用于表达所消耗时间的大小
 * @param time 消耗时间
 * @returns 颜色值
 */
const getPerfTimeColor = (time: number): string => {
    if (time > 1000) {
        return 'red';
    }
    if (time > 200) {
        return 'orange';
    }
    if (time > 50) {
        return 'muted';
    }
    return 'green';
};

/**
 * 监听消息回应
 * @param apiName 消息操作方法名称
 * @param rid 请求 ID
 * @param resolveRaw 是否使用原始数据作为结果
 * @param timeout 判定为超时的时间（单位毫秒）
 * @returns 使用 Promise 异步返回处理结果
 */
const listenMessage = (apiName: string, rid: string, resolveRaw = false, timeout = Config.system['socket.timeout']) => new Promise((resolve, reject) => {
    const listenTimer = window.setTimeout(() => {
        subscription.unsubscribe();
        const error = new CodedError(Codes.SOCKET_TIMEOUT, `Socket server request "${apiName}" timed out.`);
        reject(error);
    }, timeout);

    const subscription = socketMsSubject.subscribe(([msg, result, error]) => {
        if ([msg.method?.toLowerCase(), msg.apiName?.toLowerCase()].includes(apiName.toLowerCase()) && (!msg.rid || msg.rid === rid)) {
            window.clearTimeout(listenTimer);
            subscription.unsubscribe();
            if (error) {
                reject(error);
            } else {
                resolve(resolveRaw ? msg : result);
            }
        }
    });
});

/**
 * 获取登录请求参数列表
 * @param user 用户对象
 * @param simple 是否为简单模式
 * @returns 参数列表
 */
function buildLoginRequestParams(user: User, simple: boolean) {
    return [
        user.serverName,
        user.account,
        user.authKeyForServer,
        {status: simple && user.lastStatusBeforeDisconnect ? user.lastStatusBeforeDisconnect.name : 'online', simple},
    ] as const;
}

/**
 * Socket 服务管理类
 * @extends {Socket}
 */
class AppSocket extends Socket {
    /**
     * 当前用户
     */
    private user: User | null = null;

    /**
     * Socket 消息接收处理函数
     */
    handlers: Record<string, (...args: any[]) => void> = {};

    /**
     * 记录请求时间
     */
    private requestTimes: Record<string, number> = DEBUG ? {} : null;

    isLogging: boolean;

    private pingTimer: number | null = null;

    private lastHandTime = 0;

    perfData: {
        sendAverage: number;
        average: number;
        count: number;
        total: number;
        sendCount: number;
        sendTotal: number;
        sendSize: number;
        encodedSize: number;
        receiveSize: number;
        decodedSize: number;
    };

    /**
     * 登录的 RID
     */
    private loginRid: string;

    waitingMessages: Partial<{
        userlogin: SocketMessage;
        syssessionid: SocketMessage;
        others: SocketMessage[];
    }>;

    /**
     * 是否启用 ping
     */
    private usePing = true;

    /**
     * 发送 SocketMessage
     * @param msg 要发送的 SocketMessage 实例或者用于创建 SocketMessage 实例的属性对象
     * @returns 使用 Promise 异步返回处理结果
     */
    override send(msg: string|SocketMessageLike|SocketMessage): Promise<SocketMessage> {
        return new Promise((resolve) => {
            const message = SocketMessage.create(msg);
            if (this.user.id) {
                message.userID = this.user.id;
            }
            const rid = DEBUG ? message.createRequestID() : null;
            const startTime = DEBUG ? (process.uptime ? process.uptime() * 1000 : Date.now()) : null;
            const jsonData = this.user.hasApiScheme ? encodeSocketMessage(this.user, message, this.perfData) : message.json;

            super.send(jsonData, () => {
                if (DEBUG && (DEBUG_V || message.apiName !== 'ping')) {
                    message.startSendTime = startTime;
                    const endTime = process.uptime ? process.uptime() * 1000 : Date.now();
                    message.endSendTime = endTime;
                    this.requestTimes[rid] = endTime;

                    // 清理之前的请求时间
                    const requestTimes = Object.keys(this.requestTimes);
                    if (requestTimes.length > 50) {
                        for (const theRid of requestTimes) {
                            if ((endTime - this.requestTimes[theRid]) > 20 * 1000) {
                                delete this.requestTimes[theRid];
                            }
                        }
                    }
                    const sendRequestTime = endTime - startTime;
                    this.perfData.sendCount += 1;
                    this.perfData.sendTotal += sendRequestTime;
                    this.perfData.sendAverage = this.perfData.sendTotal / this.perfData.sendCount;
                    console.collapse('Socket Send ⬆︎', 'indigoBg', message.apiName, 'indigoPale', `${sendRequestTime.toFixed(2)} ms, average ${this.perfData.sendAverage.toFixed(2)} ms`, getPerfTimeColor(sendRequestTime));

                    console.trace('msg', message);
                    if (this.user.hasApiScheme) {
                        console.log('encoded', jsonData);
                    }
                    console.groupEnd();
                }
                resolve(message);
            });
        });
    }

    /**
     * 设置 Socket 数据包处理方法
     * @param name 要处理的数据包名称
     * @param func 处理函数
     */
    setHandler<T = any>(name: string, func: (msg: SocketMessage<T>, socket: AppSocket) => any) {
        if (typeof name === 'object') {
            if (DEBUG) {
                console.error('Warning: Use AppSocket.setHandlers(handlers) to set multiple handlers one time.');
            }
            return this.setHandlers(name);
        }
        if (DEBUG && this.handlers[name.toLowerCase()]) {
            console.error(`Warning: Socket message handler named "${name}" already exists.`);
        }
        this.handlers[name.toLowerCase()] = func;
    }

    /**
     * 取消设置 Socket 数据包处理方法
     * @param name 要处理的数据包名称
     */
    unsetHandler(name: string) {
        delete this.handlers[name.toLowerCase()];
    }

    /**
     * 通过一个对象设置多个数据包处理方法
     * @param handlers 数据包和对应的处理方法对象
     */
    setHandlers(handlers: Record<string, (msg: SocketMessage, socket: AppSocket) => any>) {
        for (const [name, value] of Object.entries(handlers)) {
            if (DEBUG && this.handlers[name.toLowerCase()]) {
                console.error(`Warning: Socket message handler named "${name}" already exists.`);
            }
            this.handlers[name.toLowerCase()] = value;
        }
    }

    /**
     * 获取消息接收处理函数
     * @param apiName 操作路径
     * @returns 处理函数
     */
    getHandler(apiName: string): (...args: any[]) => any {
        return apiName ? this.handlers[apiName.toLowerCase()] : null;
    }

    /**
     * 使用消息接收处理函数处理接收到的消息
     * @param msg 要处理的消息实例
     */
    handleMessage(msg: SocketMessage) {
        let responseTime: number = null;
        if (DEBUG && msg.rid) {
            const requestTime = this.requestTimes[msg.rid];
            if (requestTime) {
                delete this.requestTimes[msg.rid];
                const currentTime = process.uptime ? process.uptime() * 1000 : Date.now();
                responseTime = currentTime - requestTime;

                this.perfData.count += 1;
                this.perfData.total += responseTime;
                this.perfData.average = this.perfData.total / this.perfData.count;
            }
        }

        // 处理登录时顺序不一致的问题
        const {waitingMessages} = this;
        const {method} = msg;
        if (waitingMessages) {
            if ((method === 'userlogin' && msg.rid === this.loginRid) || method === 'syssessionid') {
                waitingMessages[method] = msg;
            } else {
                if (!waitingMessages.others) {
                    waitingMessages.others = [];
                }
                waitingMessages.others.push(msg);
            }
            if (DEBUG) {
                if (responseTime) {
                    console.collapse('SOCKET WAITING Data ⬇︎', 'purpleBg', method, 'purplePale', msg.isSuccess ? 'OK' : 'FAILED', msg.isSuccess ? 'greenPale' : 'dangerPale', `${responseTime} ms, average ${this.perfData.average.toFixed(2)} ms`, getPerfTimeColor(responseTime));
                } else {
                    console.collapse('SOCKET WAITING Data ⬇︎', 'purpleBg', method, 'purplePale', msg.isSuccess ? 'OK' : 'FAILED', msg.isSuccess ? 'greenPale' : 'dangerPale');
                }
                console.log('msg', msg);
                console.log('socket', this);
                console.groupEnd();
            }
            if (waitingMessages.userlogin && waitingMessages.syssessionid) {
                this.waitingMessages = null;
                this.handleMessage(waitingMessages.userlogin);
                this.handleMessage(waitingMessages.syssessionid);
                if (waitingMessages.others) {
                    waitingMessages.others.forEach(this.handleMessage.bind(this));
                }
            }
            return;
        }

        let handler = this.getHandler(method);
        let result: any;
        if (handler) {
            while (handler && typeof handler === 'string') {
                handler = this.getHandler(handler);
            }
            if (handler) {
                result = handler(msg, this);
            }
        } else {
            result = msg.data;
        }
        if (result === undefined) {
            result = msg.isSuccess;
        }
        if (DEBUG) {
            if (DEBUG_V || msg.apiName !== 'ping') {
                if (responseTime) {
                    console.collapse('SOCKET Data ⬇︎', 'purpleBg', method, 'purplePale', !handler ? 'NOT-HANDLED' : msg.isSuccess ? 'OK' : 'FAILED', (msg.isSuccess && handler) ? 'greenPale' : handler ? 'yellowPale' : 'dangerPale', `${responseTime.toFixed(2)} ms, average ${this.perfData.average.toFixed(2)} ms`, getPerfTimeColor(responseTime));
                } else {
                    console.collapse('SOCKET Data ⬇︎', 'purpleBg', method, 'purplePale', !handler ? 'NOT-HANDLED' : msg.isSuccess ? 'OK' : 'FAILED', (msg.isSuccess && handler) ? 'greenPale' : handler ? 'yellowPale' : 'dangerPale');
                }
                console.log('msg', msg);
                console.log('socket', this);
                console.groupEnd();
            } else {
                console.color('SOCKET Data ⬇︎', 'purpleBg', 'ping', 'purplePale', msg.isSuccess ? 'OK' : 'FAILED', msg.isSuccess ? 'greenPale' : handler ? 'yellowPale' : 'dangerPale', responseTime && responseTime > 200 ? `${responseTime.toFixed(2)} ms` : '', responseTime && responseTime > 200 ? 'red' : '');
            }
        }
        if (msg.apiName !== 'ping') {
            socketMsSubject.next([msg, result, msg.isSuccess ? null : new CodedError(Codes.SOCKET_FAIL, `${msg.message || ''}(${msg.apiName} failed)`)]);
        }
    }

    /**
     * 通过 Socket 发送消息并监听服务器对此消息的回应
     * @param msg 要发送的 SocketMessage 实例或者用于创建 SocketMessage 实例的属性对象
     * @param resolveRaw 是否使用原始数据作为结果
     * @returns 使用 Promise 异步返回处理结果
     */
    sendAndListen<T = any>(msg: string|SocketMessageLike|SocketMessage, resolveRaw?: boolean): Promise<T> {
        if (!this.isConnected) {
            return Promise.reject(new Error('Cannot send message, because socket is disconnected.'));
        }
        return new Promise((resolve, reject) => {
            const message = SocketMessage.create(msg);
            listenMessage(message.apiName, message.createRequestID(), resolveRaw).then(resolve).catch(reject);
            this.send(message);
        });
    }

    /**
     * 当 Socket 初始化时执行的操作
     */
    protected onInit() {
        this.lastHandTime = 0;
        if (DEBUG) {
            this.perfData = {
                count: 0,
                total: 0,
                average: 0,
                sendCount: 0,
                sendTotal: 0,
                sendSize: 0,
                encodedSize: 0,
                receiveSize: 0,
                decodedSize: 0,
                sendAverage: 0,
            };
        }
    }

    /**
     * 当 Socket 关闭时执行的操作
     * @param code 关闭代码
     * @param reason 关闭原因
     * @param unexpected 是否是意外关闭
     * @override
     */
    protected onClose(code: number, reason: string, unexpected: boolean) {
        this.stopPing();

        const {user} = this;
        if (DEBUG) {
            console.collapse('Socket Close', 'indigoBg', `${unexpected ? 'unexpected' : ''}[${code}]`, 'indigoPale', reason, '');
            if (user) {
                console.log('User', user);
                console.log('User status', user.statusName);
            } else {
                console.log('User is empty.');
            }
            console.groupEnd();
        }
        if (user?.isOnline) {
            user.setLastStatusBeforeDisconnect(user.status);
            if (unexpected || reason === 'PING_TIMEOUT') {
                user.markDisconnect();
            } else {
                user.markUnverified();
            }
        }
    }

    /**
     * 当 Socket 接收到数据时执行的操作
     * @param data Socket 接收到的数据（通常是JSON 字符串形式）
     */
    protected onData(data: string) {
        const msg = decodeSocketMessage(this.user, data, this.perfData);
        if (!msg) {
            if (DEBUG) {
                console.error('Cannot handle data:', data);
            }
            return;
        }
        this.lastHandTime = Date.now();
        this.handleMessage(msg);
    }

    /**
     * 发起登录请求
     * @param user 当前要进行登录的用户
     * @param options 登录选项
     * @param simple 是否是重连
     * @returns 使用 Promise 异步返回处理结果
     */
    login(user: User, options: {usePing: boolean; onClose: (that: Socket, code: number, reason: string, unexpected: boolean) => void;}, simple = false): Promise<any> {
        PERF_MARK('socketLoginBegin');
        this.isLogging = true;
        this.waitingMessages = {};
        return new Promise((resolve, reject) => {
            if (user) {
                this.user = user;
            } else {
                user = this.user;
            }
            if (!user) {
                reject(new Error('User is not defined.'));
                return;
            }
            const onConnect = () => {
                const loginRid = `login_${Config.system.device || 'desktop'}_${user.account}`;
                this.loginRid = loginRid;
                listenMessage('userlogin', loginRid).then((result) => {
                    this.isLogging = false;
                    if (result) {
                        this.syncUserSettings();
                        this.startPing();
                        resolve(user);
                    } else {
                        reject(user.loginError || new Error('Login result is not success.'));
                    }
                    PERF_MARK('socketLoginEnd', 'socketLoginBegin', 'socketLoginTime');
                    return result;
                }).catch(reject);

                user.loginError = null;
                this.send({
                    method: 'userLogin',
                    params: buildLoginRequestParams(user, simple),
                    rid: loginRid
                });
            };

            const {usePing, onClose} = options;
            this.usePing = usePing;
            this.init(user.socketUrl, {
                userToken: user.token,
                cipherIV: user.cipherIV,
                version: Config.pkg.version,
                connect: true,
                encryptEnable: user.enableClientAES,
                onConnect,
                onConnectFail: e => {
                    this.isLogging = false;
                    if (e.code === 1006) {
                        const error = new CodedError('SOCKET_CLOSE_ABNORMAL', {error: e});
                        reject(error);
                        return;
                    }

                    reject(e);
                },
                onClose
            });
        });
    }

    /**
     * 停止 ping 检查
     */
    private stopPing() {
        if (!this.pingTimer) {
            return;
        }
        window.clearInterval(this.pingTimer);
        this.pingTimer = null;
    }

    /**
     * 开始 ping 检查操作
     */
    private startPing() {
        this.stopPing();

        if (!this.usePing || !this.isConnected) {
            return;
        }
        this.pingTimer = window.setInterval(this.ping.bind(this), PING_INTERVAL / 2);
    }

    /**
     * 执行 ping 检查操作，如果超时则断开连接，否则向服务器发送 ping 操作
     */
    private ping() {
        if (!this.usePing || !this.isConnected) {
            return;
        }

        // 计算距离上次服务器响应的时间
        const elapsedTimeAfterLastHand = Date.now() - this.lastHandTime;

        // 如果超过一定时间（通常是 ping 时间间隔×2）没有收到服务器的响应（包括 ping 请求和其他数据推送）则直接关闭 socket 连接，然后进行重连
        if (elapsedTimeAfterLastHand > PING_TIMEOUT) {
            return this.close(4000, 'PING_TIMEOUT');
        }

        // 如果距离上次 ping 操作的时间超过 ping 发起的间隔时间，则再次发送 ping
        if (elapsedTimeAfterLastHand >= PING_INTERVAL) {
            this.send('ping');
        }
    }

    /**
     * 发起退出登录请求
     */
    async logout() {
        if (this.isConnected) {
            await this.uploadUserSettings();
            this.markClose();
            this.send({
                method: 'userLogout',
                params: [true]
            });
            return;
        }

        this.markClose();
        this.handleClose(null, 'logout');
    }

    /**
     * 发起上传用户个人配置请求
     * @param onlyChanges 是否仅导出变更的部分
     * @returns 使用 Promise 异步返回处理结果
     */
    uploadUserSettings(onlyChanges = false): Promise<any> {
        const {user} = this;
        const uploadSettings = user.config.exportCloud(onlyChanges);
        user.config.newChanges = null;
        if (!uploadSettings) {
            return Promise.resolve();
        }
        if (!this.isConnected || !user.isOnline) {
            if (DEBUG) {
                console.warn('Socket is disconnected, cannot upload user settings of', uploadSettings);
            }
            return Promise.resolve();
        }
        return this.sendAndListen({
            method: 'usersyncsettings',
            params: [
                user.account,
                uploadSettings
            ]
        });
    }

    /**
     * 从服务器同步个人配置
     * @returns 使用 Promise 异步返回处理结果
     */
    syncUserSettings(): Promise<any> {
        const {user} = this;
        return this.sendAndListen({
            method: 'usersyncsettings',
            params: [
                user.account,
                user.config.hash
            ]
        });
    }

    /**
     * 变更当前用户状态
     * @param status 状态名称
     * @returns 使用 Promise 异步返回处理结果
     */
    async changeUserStatus(status: string): Promise<boolean> {
        try {
            await this.changeUser({status});
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 变更用户信息
     * @param userChangeData 要变更的属性对象
     * @returns 使用 Promise 异步返回处理结果
     */
    changeUser(userChangeData: { [s: string]: any; }): Promise<any> {
        userChangeData.account = this.user.account;
        if (userChangeData.status === undefined) {
            userChangeData.status = '';
        }
        return this.sendAndListen({
            method: 'userUpdate',
            params: [userChangeData]
        });
    }

    /**
     * 修改用户密码
     * @param password 新的密码
     * @returns 使用 Promise 异步返回处理结果
     */
    changeUserPassword(password: string): Promise<any> {
        return this.changeUser({
            password: md5(password)
        });
    }

    /**
     * 订阅用户状态变更
     * @param type 订阅类型
     * @param objects 订阅的 ID 数组
     * @returns 使用 Promise 异步返回处理结果
     */
    subscribeUser(type: string, objects: number[]): Promise<any> {
        return this.send({
            method: 'usersubscribe',
            requestData: {
                type,
                objects
            }
        });
    }
}

/**
 * 当前 Socket 管理类实例
 */
const socket = new AppSocket();

if (DEBUG) {
    global.$socket = socket;
}

export default socket;
