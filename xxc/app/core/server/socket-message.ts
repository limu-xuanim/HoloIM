import Config from '../../config';
import Lang from '../lang';
import fuid from '../../utils/fuid';

export type SocketMessageLike = Partial<{
    method: string;
    params: any[]|any;
    data: any;
    result: string;
    version: string;
    device: string;
    rid: string;
    module: string;
    lang: string;
    userID: number;
    type: string;
    objects: any[]
}>;

/**
 * Socket 服务消息类
 */
export default class SocketMessage<T = any> {
    /**
     * 操作方法名称
     */
    method: string;

    /**
     * 操作方法的参数
     */
    params: any[];

    /**
     * 操作数据
     */
    data: T;

    /**
     * 操作结果
     */
    result: string;

    /**
     * 版本号
     */
    version: string;

    /**
     * 当前设备类型
     */
    device: string;

    /**
     * 请求 ID，用于跟踪请求响应
     */
    rid: string;

    /**
     * 模块
     */
    module: string;

    /**
     * 语言
     */
    lang: string;

    /**
     * 用户 ID
     */
    userID: number;

    /**
     * 请求数据
     */
    _requestData: SocketMessageLike;

    /**
     * 翻页对象
     */

    pager?: Partial<PagerState>;

    /**
     * 消息信息
     */
    message?: string;

    startSendTime: number;

    endSendTime: number;

    /**
     * 创建一个 Socket 服务消息类
     * @param data 属性数据对象
     */
    constructor(data: SocketMessageLike) {
        Object.assign(this, {
            version: Config.pkg.displayVersion || Config.pkg.version,
            device: Config.system.device || 'desktop',
            lang: Lang.name
        }, data);
    }

    /**
     * 生成请求 ID
     * @returns 当前数据包消息请求 ID
     */
    createRequestID(): string {
        if (!this.rid) {
            this.rid = fuid();
        }
        return this.rid;
    }

    /**
     * 获取 API 名称
     */
    get apiName(): string {
        const method = this.method.toLowerCase();
        if (this.module !== undefined && this.module !== 'im' && this.module.length) {
            return `${this.module.toLowerCase()}/${method}`;
        }
        return method;
    }

    /**
     * 获取请求时的类型描述名称
     */
    get requestSchemeName(): string {
        return `${this.apiName}Request`;
    }

    /**
     * 获取 JSON 字符串形式
     */
    get json(): string {
        return JSON.stringify(this.requestData);
    }

    /**
     * 获取发送给服务器的数据对象
     */
    get requestData() {
        const data: SocketMessageLike = {
            version: this.version,
            device: this.device,
            lang: this.lang,
            method: this.method.toLowerCase(),
        };
        if (this.params !== undefined) {
            data.params = this.params;
        }
        if (this.rid !== undefined) {
            data.rid = this.rid;
        }
        if (this.userID !== undefined) {
            data.userID = this.userID;
        }
        if (this.module !== undefined && this.module !== 'im') {
            data.module = this.module;
        }
        return Object.assign(data, this._requestData);
    }

    /**
     * 设置发送给服务器的数据对象
     * @param newRequestData 要设置的数据
     */
    set requestData(newRequestData: SocketMessageLike) {
        this._requestData = newRequestData;
    }

    /**
     * 获取此消息待办的操作是否成功
     */
    get isSuccess(): boolean {
        return this.result === 'success' || (this.result === undefined);
    }

    /**
     * 创建一个 SocketMessage 实例
     * @static
     * @param msg 一个 SocketMessage 实例或者用于创建实例的属性对象
     * @returns SocketMessage 实例
     */
    static create(msg: string|SocketMessage|SocketMessageLike): SocketMessage {
        if (msg instanceof SocketMessage) {
            return msg;
        }
        if (typeof msg === 'string') {
            msg = {method: msg};
        }
        return new SocketMessage(msg);
    }
}
