import crypto from 'Platform/crypto';
import Status from '~/app/utils/status';

type InitOptions = {
    userToken: string;
    cipherIV: string;
    version: string;
    connect: boolean;
    encryptEnable: boolean;
    onConnect: () => void;
    onConnectFail: (e: CloseEvent) => void;
    onClose: (that: Socket, code: number, reason: string, unexpected: boolean) => void;
};

type Options = InitOptions & Partial<{
    parseJSON: boolean;
    encryptFallback: boolean;
    onError: (that: Socket, event: Event) => void;
    onData: (that: Socket, data: any) => void;
}>;

const statuses = Object.freeze({
    CONNECTING: 0, // 连接还没开启。
    OPEN: 1, // 连接已开启并准备好进行通信。
    CLOSING: 2, // 连接正在关闭的过程中。
    CLOSED: 3, // 连接已经关闭，或者连接无法建立。
    UNCONNECT: 4, // 未连接
});

type SocketStatusName = keyof typeof statuses;

/**
 * Socket 连接状态管理器
 */
const STATUS = new Status<SocketStatusName>(statuses, 4);

export default abstract class Socket {
    /**
     * Socket 连接状态
     */
    private status = STATUS.create(STATUS.$.UNCONNECT);

    protected options!: Options;

    private url!: string;

    private client: WebSocket | null = null;

    protected abstract onInit(): void;

    protected abstract onClose(code: number, reason: string, unexpected: boolean): void;

    protected abstract onData(data: any): void;

    /**
     * 文本解码器
     */
    private readonly textDecoder = new TextDecoder('utf-8');

    /**
      * 文本编码器
      */
    private readonly textEncoder = new TextEncoder();

    /**
     * 初始化 Socket 连接
     * @param url Socket 连接地址
     * @param options Socket 连接选项
     */
    public init(url: string, options: InitOptions) {
        // Close socket before init
        this.close(1000, 'Normal Closure From Init');

        this.options = {
            parseJSON: true,
            encryptFallback: true,
            ...options
        };

        this.url = url;
        this.status.change(STATUS.$.UNCONNECT);

        if (!this.url) {
            throw new TypeError(`The socket url must be a non-empty string, but received '${this.url}'`);
        }

        if (this.options.connect) {
            this.connect();
        }

        if (this.onInit) {
            this.onInit();
        }
    }

    /**
     * 获取状态名称
     */
    get statusName() {
        return this.status.name;
    }

    /**
     * 获取状态值
     */
    get statusValue() {
        return this.status.value;
    }

    /**
     * 是否连接成功
     */
    get isConnected() {
        return this.isStatus(STATUS.$.OPEN);
    }

    /**
     * 是否正在连接中
     */
    get isConnecting() {
        return this.isStatus(STATUS.$.CONNECTING);
    }

    /**
     * 判断当前状态是否是给定的状态
     * @param status 要判断的状态值或状态名称
     * @returns 如果为 `true` 则为给定的状态，否则不是
     */
    public isStatus(status: SocketStatusName|number): boolean {
        return this.status.is(status);
    }

    /**
     * 从 WebSocket 实例更新状态信息
     */
    public updateStatusFromClient() {
        this.status.change(this.client?.readyState ?? STATUS.$.UNCONNECT);
    }

    /**
     * 开始连接
     */
    public connect() {
        this.close(1000, 'Normal Closure From Connect');

        this.status.change(STATUS.$.CONNECTING)

        const client = new WebSocket(this.url);
        client.binaryType = 'arraybuffer';
        client.onopen = this.handleConnect.bind(this);
        client.onmessage = e => {
            this.handleData(e.data);
        };
        client.onclose = e => {
            if (this.isConnecting) {
                return this.handleConnectFail(e);
            }
            this.handleClose(e.code, e.reason);
        };
        client.onerror = e => {
            if (!this.isConnected) {
                return;
            }
            this.handleError(e);
        };

        this.client = client;
    }

    /**
     * 重新连接
     */
    public reconnect() {
        return this.connect();
    }

    /**
     * 处理连接失败事件
     * @param e 连接失败事件对象
     */
    protected handleConnectFail(e: CloseEvent) {
        this.options.onConnectFail(e);
    }

    /**
     * 处理连接成功事件
     */
    protected handleConnect() {
        this.updateStatusFromClient();

        if (DEBUG) {
            console.collapse('SOCKET Connected', 'greenBg', this.url, 'greenPale');
            console.log('socket', this);
            console.groupEnd();
        }

        this.options.onConnect();
    }

    /**
     * 处理连接关闭事件
     * @param code 关闭代码
     * @param reason 关闭原因
     */
    public handleClose(code: number, reason: string) {
        const unexpected = !this.status.is(STATUS.$.CLOSING);
        this.updateStatusFromClient();
        this.client = null;

        if (DEBUG) {
            console.collapse('SOCKET Closed', 'greenBg', this.url, 'greenPale');
            console.trace('socket', this);
            console.log('code', code);
            console.log('reason', reason);
            console.groupEnd();
        }

        const {onClose} = this.options;
        onClose(this, code, reason, unexpected);

        this.onClose(code, reason, unexpected);
    }

    /**
     * 处理连接发生错误
     * @param event 连接错误对象
     */
    protected handleError(event: Event) {
        this.updateStatusFromClient();

        if (DEBUG) {
            console.collapse('SOCKET Error', 'redBg', this.url, 'redPale');
            console.log('socket', this);
            console.log('error', event);
            console.groupEnd();
        }

        this.options.onError?.(this, event);
    }

    /**
     * 通过 Socket 连接向服务器发送数据
     * @param rawData 要发送的数据
     * @param callback 发送完成后的回调函数
     */
    public send(rawData: string, callback?: () => void) {
        if (!this.client) {
            throw new TypeError('Socket client cant be empty!');
        }

        const data = this.options?.encryptEnable
            ? crypto.encrypt(rawData, this.options.userToken, this.options.cipherIV)
            : this.textEncoder.encode(rawData);

        this.client.send(data);
        callback?.();
    }

    /**
     * 处理接收到数据
     * @param rawData 接收到的数据
     */
    protected handleData(rawData: ArrayBuffer) {
        const {encryptEnable, encryptFallback, parseJSON, onData, userToken, cipherIV} = this.options;
        this.updateStatusFromClient();

        let data = null;
        if (encryptEnable) {
            data = crypto.decrypt(rawData, userToken, cipherIV);
        } else {
            data = this.textDecoder.decode(rawData);
        }

        if (data && parseJSON) {
            try {
                data = JSON.parse(data);
            } catch (_) {
                if (encryptFallback) {
                    const decryptData = crypto.decrypt(rawData, userToken, cipherIV);
                    if (typeof decryptData === 'string') {
                        data = JSON.parse(decryptData);
                        if (DEBUG) {
                            console.collapse('SOCKET Data Encrypt Fallback', 'redBg');
                            console.log('data', data);
                            console.log('rawData', rawData);
                            console.log('socket', this);
                            console.log('decryptData', decryptData);
                            console.groupEnd();
                        }
                    }
                }
            }
        }

        onData?.(this, data);
        this.onData?.(data);
    }

    /**
     * 将连接标记为关闭
     */
    public markClose() {
        this.status.change(STATUS.$.CLOSING);
    }

    /**
     * 移除所有监听的事件
     */
    protected removeAllListeners() {
        if (!this.client) {
            return;
        }

        this.client.onclose = null;
        this.client.onerror = null;
        this.client.onmessage = null;
        this.client.onopen = null;
    }

    /**
     * 关闭 Socket 连接
     * @param code 关闭代码
     * @param reason 关闭原因
     */
    public close(code: number, reason: string) {
        if (this.client) {
            if (reason && (reason === 'close' || reason.startsWith('USER_KICKOFF') || reason === 'PING_TIMEOUT')) {
                if (DEBUG) {
                    console.collapse('SOCKET Close', 'greenBg', reason, 'greenPale');
                    console.log('socket', this);
                    console.log('reason', reason);
                    console.groupEnd();
                }
                this.markClose();
            }
            this.removeAllListeners();
            this.client.close();
            this.handleClose(code, reason);
        }
    }
}
