type ErrorObject = {
    message: string;
    code?: string;
} & Extras;

type Extras = Partial<{
    detail: string;
    error: any;
    status: number;
    statusMessage: string;
    event: Event;
    responseText: string;
    url: string;
    serverInfoUrl: string;
    version: string;
    serverVersion: string;
    minSupportVersion: string;
    user: User;
    attemptsDetail: string;
    attempts: any[];
    request: Request;
    response: Response;
}>;

function isErrorObject(obj: object): boolean {
    if (obj === null) {
        return false;
    }
    if (!('message' in obj)) {
        return false;
    }
    return true;
}

/**
 * 已编码的错误类
 */
export default class CodedError extends Error {
    /**
     * 错误名称
     */
    override name: string;

    /**
     * 错误编码
     */
    code: string;

    /**
     * 与该错误相关的额外信息
     */
    extras: Extras;

    /**
     * 错误发生的时间戳
     */
    time: number;

    /**
     * 系统中已编码的错误
     * @param code 错误编码
     * @param message 消息
     * @param extras 额外信息
     */
    constructor(code: string, message?: string, extras?: Extras);

    /**
     * 系统中已编码的错误
     * @param code 错误编码
     * @param extras 额外信息
     */
    constructor(code: string, extras?: Extras);

    constructor(code: string, message: string|Extras = `[${code}]`, extras: Extras = {}) {
        if (typeof message === 'object' && message !== null) {
            extras = message;
            message = null;
        }

        super(message as string);
        this.name = 'CodedError';
        this.code = code;
        this.extras = extras;
        this.time = Date.now();
    }

    /**
     * 创建一个已编码的错误对象
     * @param error 原始错误对象
     * @param code 默认错误编码
     */
    static create(error: string|Error|CodedError|ErrorObject, code = Codes.COMMON_ERROR): CodedError {
        if (typeof error === 'string') {
            return new CodedError(code, error);
        }

        if (error instanceof CodedError) {
            return error;
        }

        if (error instanceof Error) {
            const codedError = new CodedError(
                code,
                error.message,
                {error}
            );
            codedError.stack = error.stack;
            return codedError;
        }
        if (isErrorObject(error)) {
            const {message} = error;
            delete error.message;

            if (!code && error.code) {
                ({code} = error);
                delete error.code;
            }
            return new CodedError(code, message, error);
        }
        return new CodedError(
            Codes.TYPE_ERROR,
            'Cannot create a CodedError instance with the given params.',
            {
                error,
            }
        );
    }

    getExtras(): Extras;

    getExtras<P extends keyof Extras>(name: P): typeof this.extras[P];

    /**
     * 获取错误的额外信息值
     * @param name 信息名称
     */
    getExtras<P extends keyof Extras>(name?: P): Extras|typeof this.extras[P] {
        if (!name) {
            return this.extras;
        }
        return this.extras?.[name];
    }

    /**
     * 设置错误的额外信息
     * @param extras 信息对象
     */
    setExtras(extras: Extras) {
        if (!extras || typeof extras !== 'object') {
            return;
        }

        Object.assign(this.extras, extras);
    }

    /**
     * 获取错误详细信息
     */
    get detail() {
        return this.getExtras('detail');
    }

    /**
     * 设置错误详细信息
     */
    set detail(detail: string) {
        this.setExtras({detail});
    }

    /**
     * 获取原始错误对象
     */
    get error(): any {
        return this.getExtras('error');
    }

    /**
     * 设置原始错误对象
     */
    set error(error: any) {
        this.setExtras({error});
    }

    /**
     * 获取详细消息
     */
    get detailMessage(): string {
        const {message, detail} = this;
        let detailMessage = message;
        if (detail && message !== detail) {
            detailMessage = `${detailMessage}\n${detail}`;
        }
        return detailMessage;
    }
}

/**
 * ERROR CODE 集合
 */
export enum Codes {
    COMMON_ERROR = 'COMMON_ERROR',

    SERVER_VERSION_UNKNOWN = 'SERVER_VERSION_UNKNOWN',
    SERVER_VERSION_NOT_SUPPORT = 'SERVER_VERSION_NOT_SUPPORT',

    USER_INVALID = 'USER_INVALID',
    USER_DENY_UPLOAD = 'USER_DENY_UPLOAD',
    BUSY = 'BUSY',

    CLIENT_REQUIRE_UPDATE = 'CLIENT_REQUIRE_UPDATE',

    SOCKET_CLOSED = 'SOCKET_CLOSED',
    SOCKET_FAIL = 'SOCKET_FAIL',
    SOCKET_TIMEOUT = 'SOCKET_TIMEOUT',

    HTTP_DATA_ERROR = 'HTTP_DATA_ERROR',
    HTTP_REQUEST_FAIL = 'HTTP_REQUEST_FAIL',
    HTTP_STATUS_ERROR = 'HTTP_STATUS_ERROR',
    HTTP_ABORT = 'HTTP_ABORT',
    HTTP_ERROR = 'HTTP_ERROR',
    HTTP_ETIMEDOUT = 'HTTP_ETIMEDOUT',

    NET_TRACEROUTE_ERROR = 'NET_TRACEROUTE_ERROR',
    NET_PING_FAIL = 'NET_PING_FAIL',
    NET_LOOKUP_FAIL = 'NET_LOOKUP_FAIL',

    WRONG_RESULT = 'WRONG_RESULT',
    EMPTY_FILE_DATA = 'EMPTY_FILE_DATA',
    TYPE_ERROR = 'TYPE_ERROR',

    INVALID_TOKEN = 'INVALID_TOKEN',
    INVALID_URL = 'INVALID_URL',

    BACKEND_SERVER_ERROR = 'BACKEND_SERVER_ERROR',
    NAMESERVER_NOT_FOUND = 'NAMESERVER_NOT_FOUND'
}
