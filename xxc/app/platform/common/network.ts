import to from 'await-to-js';
import type {FileDataLike} from '~/app/core/files/file-data';
import {limitTimePromise} from '~/app/utils/promise';
import CodedError, {Codes} from '~/app/utils/coded-error';

/** 默认超时时间，单位毫秒 */
const TIMEOUT_DEFAULT = 15 * 1000;

const handledStatus = new Set([401, 402, 403, 405, 500]);

/**
 * 使用 fetch API 发起 HTTP 请求
 * @param url 请求地址
 * @param options 请求选项
 * @returns 使用 Promise 异步返回处理结果
 */
export const request = async (url: string, options?: RequestInit) => {
    const requestObj = new Request(url, options);
    const [fetchError, response] = await to(window.fetch(requestObj));

    if (fetchError) {
        if (DEBUG) {
            console.collapse(`HTTP ${options?.method || 'GET'}`, 'blueBg', url, 'bluePale', 'HTTP_REQUEST_FAIL', 'redPale');
            console.log('options', options);
            console.log('error', fetchError);
            console.groupEnd();
        }
        return Promise.reject(new CodedError(Codes.HTTP_REQUEST_FAIL, {
            error: fetchError,
            detail: [
                `Fetch.${(options?.method) || 'GET'} from ${url}`,
                '    Request:',
                `        Method: ${requestObj.method || ''}`,
            ].join('\n')
        }));
    }

    if (response.ok) {
        if (DEBUG) {
            console.collapse(`HTTP ${options?.method || 'GET'}`, 'blueBg', url, 'bluePale', 'OK', 'greenPale');
            console.log('options', options);
            console.log('response', response);
            console.log('body', response.body);
            console.groupEnd();
        }
        return response;
    }

    const error = new CodedError(
        handledStatus.has(response.status) ? `HTTP_STATUS_${response.status}` : Codes.HTTP_STATUS_ERROR,
        `Status code is ${response.status}.`,
        {
            request: requestObj,
            response,
            detail: [
                `Fetch from ${requestObj.url}`,
                '    Request:',
                `        Method: ${requestObj.method || ''}`,
                `        Headers: ${options?.headers ? JSON.stringify(options.headers) : ''}`,
                '    Response:',
                `        Type: ${response.type || ''}`,
                `        Status: ${response.status || ''}`,
                `        OK: ${response.ok || ''}`,
                `        Redirected: ${response.redirected || ''}`,
                `        StatusText: ${response.statusText || ''}`,
            ].join('\n')
        }
    );

    const [, body] = await to(response.clone().text());

    if (body) {
        error.extras.detail += `\n        Body: ${body || ''}`;
    }
    return Promise.reject(error);
};

/**
 * 从 [Response](https://developer.mozilla.org/zh-CN/docs/Web/API/Response) 对象获取纯文本
 * @param response Response 对象
 * @returns 响应文本
 */
export const getTextFromResponse = async (response: Response): Promise<string> => {
    const contentType = response.headers.get('Content-Type');
    if (contentType?.toLowerCase().includes('charset=gb')) {
        const blob = await response.blob();
        return (new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(<string>reader.result);
            };
            reader.onerror = reject;
            reader.readAsText(blob, 'GBK');
        }));
    }
    return response.text();
};

/**
 * 发起一个 POST 请求，并且将请求返回的结果当作纯文本处理
 * @param url 请求地址
 * @param options 请求选项
 * @returns POST 请求结果
 */
export const getText = (url: string, options: RequestInit): Promise<string> => request(url, options).then(getTextFromResponse);

/**
 * 发起一个 POST 请求，并且将请求返回的结果当作纯文本处理
 * @param url 请求地址
 * @param options 请求选项
 * @returns POST 请求结果
 */
export const postText = async (url: string, options: RequestInit): Promise<string> => {
    if (options instanceof FormData) {
        options = {body: options};
    }
    const response = await request(url, {method: 'POST', ...options});
    return response.text();
};

/**
 * 发起一个 GET 请求，并将请求结果视为 JSON 处理
 * @param url 请求地址
 * @param options 请求选项
 * @returns GET 请求结果
 */
export const getJSON = (url: string, options?: RequestInit) => request(url, options).then(response => response.json());

/**
 * 发起一个 POST 请求，并将请求结果视为 JSON 处理
 * @param url 请求地址
 * @param options 请求选项
 * @returns 使用 Promise 异步返回处理结果
 */
export const postJSON = async (url: string, options: RequestInit) => {
    if (options instanceof FormData) {
        options = {body: options};
    }

    const [requestError, response] = await to<Response, CodedError>(request(url, {...options, method: 'POST'}));

    if (requestError) {
        const responseInError = requestError.getExtras('response');
        if (responseInError) {
            const responseText = await responseInError.text();
            requestError.setExtras({responseText});
            requestError.detail = `${responseText}\n-------------------\n${requestError.detail}`;
        }
        return Promise.reject(requestError);
    }

    const [parseError, json] = await to(response.json());

    if (parseError) {
        return Promise.reject(CodedError.create(parseError));
    }
    return json;
};

/**
 * 发起一个 GET 请求，并将请求结果视为 JSON 特殊对象处理，并且根据特殊对象上的 `status` 或 `result` 属性来判断是否请求成功，如果 `status` 或 `result` 属性为 `'ok'`、`'success'` 或 `200` 则表示请求成功
 * @param url 请求地址
 * @param options 请求选项
 * @returns 使用 Promise 异步返回处理结果
 */
export const getJSONData = async (url: string, options: RequestInit) => {
    const json = await getJSON(url, options);
    if (json) {
        const jsonResult = json.status || json.result;
        if (jsonResult === 'success' || jsonResult === 'ok' || jsonResult === 200) {
            return Promise.resolve(json.data);
        }
        return Promise.reject(new CodedError(Codes.WRONG_RESULT, json.message || json.reason || `The server data result is ${jsonResult}`, {
            detail: [
                `Fetch json data from ${url}`,
                `    JSON: ${JSON.stringify(json)}`,
            ].join('\n')
        }));
    }
    return Promise.reject(new CodedError(Codes.HTTP_DATA_ERROR, `Server return a null json when get json from ${url}.`, {url}));
};

/**
 * 发起一个 POST 请求，并将请求结果视为 JSON 特殊对象处理，并且根据特殊对象上的 `status` 或 `result` 属性来判断是否请求成功，如果 `status` 或 `result` 属性为 `'ok'`、`'success'` 或 `200` 则表示请求成功
 * @param url 请求地址
 * @param options 请求选项
 * @returns 使用 Promise 异步返回处理结果
 */
export const postJSONData = (url: string, options: RequestInit) => {
    if (options instanceof FormData) {
        options = {body: options};
    }
    return getJSONData(url, {method: 'POST', ...options});
};

/**
 * 文件上传下载时使用到的的 XHR 对象
 */
const fileNetworkXhrMap = new Map<string, XMLHttpRequest>();

/**
 * 下载文件
 * @param url 下载地址
 * @param beforeSend 上传之前的回调函数
 * @param onProgress 上传进度变更的回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export const downloadFile = (url: string, beforeSend:(xhr: XMLHttpRequest) => void, onProgress: (progress: number, loaded: number, total: number) => void) => (new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        fileNetworkXhrMap.delete(url);
        if (xhr.status === 200) {
            const arrayBuffer = xhr.response;
            if (arrayBuffer) {
                resolve(arrayBuffer);
            } else {
                reject(new CodedError(Codes.EMPTY_FILE_DATA, 'File data is empty.'));
            }
        } else {
            reject(new CodedError(Codes.HTTP_STATUS_ERROR, 'Status code is not 200.', {status: xhr.status, statusMessage: xhr.statusText}));
        }
    };
    xhr.onprogress = e => {
        // TODO: 可能出现 Content-Length 不存在的情况（文件在 XXD 被加密、传输被压缩等），此时需要按照已知的文件大小去计算进度。
        if (e.lengthComputable && onProgress) {
            onProgress((100 * e.loaded) / e.total, e.loaded, e.total);
        }
    };
    xhr.onerror = event => {
        fileNetworkXhrMap.delete(url);
        reject(new CodedError(Codes.HTTP_REQUEST_FAIL, 'Download request error.', {
            event
        }));
    };
    xhr.onabort = event => {
        fileNetworkXhrMap.delete(url);
        reject(new CodedError(Codes.HTTP_ABORT, 'Download request abort.', {
            event
        }));
    };

    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    if (beforeSend) {
        beforeSend(xhr);
    }
    fileNetworkXhrMap.set(url, xhr);
    xhr.send();
}));

/**
 * 上传文件到服务器
 * @param file 要上传的文件对象
 * @param serverUrl 上传的地址
 * @param beforeSend 上传之前的回调函数
 * @param onProgress 上传进度变更的回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export const uploadFile = (
    file: FileData,
    serverUrl: string,
    options: Partial<{
        beforeSend: (xhr: XMLHttpRequest) => void,
        onProgress: (progress: number, loaded: number, total: number) => void
        form: FormData,
    }> = {}
): Promise<FileDataLike> => {
    const {beforeSend, onProgress, form} = options;
    return (new Promise((resolve, reject) => {
        const {gid} = file;
        const xhr = new XMLHttpRequest();
        xhr.onload = () => {
            if (gid) {
                fileNetworkXhrMap.delete(gid);
            }
            if (xhr.status === 200) {
                const bodyText = xhr.responseText;
                try {
                    const json = JSON.parse(bodyText);
                    if (json.result === 'success' && json.data) {
                        resolve(json.data);
                    } else {
                        reject(new CodedError(Codes.WRONG_RESULT, `The server returned wrong result: ${xhr.responseText}`, {
                            responseText: xhr.responseText
                        }));
                    }
                } catch (error) {
                    if (bodyText.indexOf('user-deny-attach-upload') > 0) {
                        reject(new CodedError(Codes.USER_DENY_UPLOAD, 'Server denied the request.', {
                            responseText: xhr.responseText
                        }));
                    } else {
                        reject(new CodedError(Codes.HTTP_DATA_ERROR, `Unknown data content: ${bodyText}`, {
                            responseText: xhr.responseText,
                            error
                        }));
                    }
                }
            } else {
                reject(new CodedError(Codes.HTTP_STATUS_ERROR, 'Status code is not 200.', {
                    status: xhr.status,
                    statusMessage: xhr.statusText
                }));
            }
        };
        xhr.upload.onprogress = e => {
            if (e.lengthComputable && onProgress) {
                onProgress((100 * e.loaded) / e.total, e.loaded, e.total);
            }
        };
        xhr.onerror = event => {
            if (gid) {
                fileNetworkXhrMap.delete(gid);
            }
            reject(new CodedError(Codes.HTTP_REQUEST_FAIL, 'Upload request error.', {
                event
            }));
        };
        xhr.onabort = event => {
            if (gid) {
                fileNetworkXhrMap.delete(gid);
            }
            reject(new CodedError(Codes.HTTP_ABORT, 'Upload request abort.', {
                event
            }));
        };

        xhr.open('POST', serverUrl);
        xhr.setRequestHeader('X-FILENAME', encodeURIComponent(file.name));
        if (beforeSend) {
            beforeSend(xhr);
        }
        if (gid) {
            fileNetworkXhrMap.set(gid, xhr);
        }
        xhr.send(form ?? file.originFile);
    }));
};

/**
 * 取消上传文件
 * @param fileGid 上传文件对象的 gid
 * @returns 如果为 `true` 表示取消成功
 */
export const abortUploadFile = (fileGid: string): boolean => {
    const xhr = fileNetworkXhrMap.get(fileGid);
    if (xhr && xhr.readyState >= 1 && xhr.readyState <= 3) {
        xhr.abort();
        fileNetworkXhrMap.delete(fileGid);
        return true;
    }
    return false;
};

/**
 * 取消下载文件
 * @param url 下载文件对象的 gid
 * @returns 如果为 `true` 表示取消成功
 */
export const abortDownloadFile = (url: string): boolean => {
    const xhr = fileNetworkXhrMap.get(url);
    if (xhr && xhr.readyState >= 1 && xhr.readyState <= 3) {
        xhr.abort();
        fileNetworkXhrMap.delete(url);
        return true;
    }
    return false;
};

/**
 * 创建一个超时即失败的 Promise
 * @param promise Promise 对象
 * @param time 超时时间，单位毫秒
 * @param error 超时时的错误文本
 * @returns 返回一个新的 Promise
 */
export const timeout = <T>(promise: Promise<T>, time = TIMEOUT_DEFAULT, error = new Error('timeout')) => limitTimePromise(promise, time, error);

const network = {
    request,
    getTextFromResponse,
    getText,
    postText,
    getJSONData,
    postJSONData,
    downloadFile,
    uploadFile,
    abortUploadFile,
    abortDownloadFile,
    timeout,
};

export default network;

export type PlatformNetwork = typeof network
    & {
        checkFileCache?: (file: FileData, user: User, storageType?: string, isThumbnail?: boolean) => Promise<string | false>
        downloadFile: (user: User, file: FileData, options?: Partial<{
            onProgress: (progress: number, receivedLength: number, total: number) => void;
            isThumbnail: boolean;
            disableCache: boolean;
        }>) => Promise<FileData>;
        uploadFile: (user: User, file: FileData, options?: Partial<{
            copyCache: boolean;
            onProgress: (progress: number, loaded: number, total: number) => void;
            beforeSend: (xhr: XMLHttpRequest, file: FileData, serverUrl: string) => void;
        }>) => Promise<unknown>;
    };
