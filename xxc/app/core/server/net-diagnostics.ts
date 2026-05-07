import CodedError, {Codes} from '~/app/utils/coded-error';
import platform from '~/app/platform';
import {createUser} from '../profile';
import Config from '~/app/config';
import Lang from '../lang';
import {login} from './index';
import {formatDate} from '~/app/utils/date-helper';
import {isValidIP} from '~/app/utils/string-helper';
import {createTimeoutAbortController} from '~/app/utils/abort-handler';
import {LoginMode} from '~/app/constants';
import type {ElectronPlatform} from '~/app/platform/electron';

const netTools = platform.access<ElectronPlatform['netTools'] | undefined>('netTools');

type Result = {
    type: 'error'|'warning'|'info'|'success';
    id?: number;
    code?: string;
    message?: string;
    detail?: string;
    suggestions?: string[];
    time?: number;
    hostname?: string;
    port?: string;
    error?: any;
    serverInfoUrl?: string;
    response?: any;
    loginError?: CodedError;
    url?: string;
};

/**
 * 诊断用户的网络连接问题
 * @param user 要登录的用户
 * @param loginError 上次登录捕获到的错误信息
 * @param onResult 当获取到中间诊断结果时的回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export async function diagnoseNetwork(user: User, loginError?: CodedError | null, onResult?: (result: Result, results?: Result[]) => void): Promise<Result[]>;

/**
 * 诊断用户的网络连接问题
 * @param user 要登录的用户
 * @param onResult 当获取到中间诊断结果时的回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export async function diagnoseNetwork(user: User, onResult?: (result: Result, results?: Result[]) => void): Promise<Result[]>;

export async function diagnoseNetwork(user: User, loginError?: CodedError | null | ((result: Result, results?: Result[]) => void), onResult?: (result: Result, results?: Result[]) => void): Promise<Result[]> {
    user = createUser(user);

    if (typeof loginError === 'function') {
        onResult = loginError;
        loginError = null;
    }

    const {server} = user;
    const {hostname, port} = server;

    const results: Result[] = [];
    let ip = isValidIP(hostname) ? hostname : null;

    // 记录诊断结果
    const resultsInfo = {
        error: 0,
        warning: 0,
        info: 0,
        success: 0,
    };
    const addResult = (result: Result) => {
        if (result.code) {
            result.message ??= Lang.format(`error.${result.code}`, result);
            const suggestions = Lang.format(`error.suggestion.${result.code}`, result);
            if (suggestions) {
                result.suggestions = suggestions.split('|');
            }
        }
        result.time ??= Date.now();

        resultsInfo[result.type]++;
        result.id = results.length;
        results.push(result);

        if (DEBUG) {
            const logColors = {
                error: 'red',
                success: 'green',
                warning: 'yellow',
                info: 'blue'
            };
            console.collapse('Diagnostics', 'blueBg', `${result.type.toUpperCase()}${result.code ? `[${result.code}]` : ''}`, `${logColors[result.type]}Pale`, result.message, logColors[result.type]);
            if (result.detail) {
                console.log('DETAIL', result.detail);
            }
            console.trace('RESULT', result);
            console.groupEnd();
        }

        if (onResult) {
            onResult(result, [...results]);
        }
    };

    addResult({
        type: 'info',
        message: Lang.format('diagnostics.startingDiagnoseNetwork', {
            url: server.toString(),
            account: user.account,
            version: `${Config.pkg.version}`,
            server,
            user
        }),
        detail: `log time: ${formatDate(Date.now(), 'yyyy-MM-dd hh:mm:ss.SSS')}\nbuild time: ${formatDate(Config.pkg.buildTime)}\nplatform: ${platform.type}\nos: ${platform.env.os}\narch: ${(<any>platform.env)?.arch}`
    });

    // 尝试进行一次常规登录
    if (!loginError) {
        try {
            user = await login(user, LoginMode.silent, 10000);
            // 如果登录成功则直接返回
            addResult({
                type: 'success',
                message: Lang.string('diagnostics.endDiagnoseNetwork')
            });
            return results;
        } catch (error) {
            loginError = CodedError.create(error);
        }
    }

    // 如果上次登录是连接问题则尝试定位原因
    let foundConnectProblem = false;
    if ((loginError as CodedError).code === 'HTTP_REQUEST_FAIL' || (loginError as CodedError).code === 'COMMON_ERROR') {
        // 使用 HTML5 API 检测网络是否可用
        if (navigator.onLine === false) {
            addResult({
                type: 'warning',
                code: 'NET_OFFLINE',
            });
            foundConnectProblem = true;
        }

        if (!ip && netTools?.getNameServers) {
            const nameServers = netTools.getNameServers();
            if (nameServers.length === 0 || (nameServers.length === 1 && nameServers[0] === '127.0.0.1')) {
                addResult({
                    type: 'warning',
                    code: Codes.NAMESERVER_NOT_FOUND,
                    detail: nameServers.join(window.nodeAPI.osEOL),
                });
            }
        }

        // 如果用户填写的是域名不是 IP，尝试解析为 IP
        let dnsLookupResult = true;
        if (!ip && netTools?.dnsLookup) {
            try {
                ip = await netTools.dnsLookup(hostname);
                addResult({
                    type: 'info',
                    message: Lang.format('diagnostics.resolveHostname', {hostname, ip}),
                });
            } catch (originError) {
                const error = CodedError.create(originError, originError.code ? `HOST_${originError.code}` : 'NET_LOOKUP_FAIL');
                addResult({
                    type: 'error',
                    code: error.code,
                    hostname,
                    detail: error.detailMessage,
                    error
                });
                foundConnectProblem = true;
                dnsLookupResult = false;
            }
        }

        // 尝试使用 ping 来确定服务器可访问性
        if (dnsLookupResult && netTools?.ping) {
            try {
                const pingResult = await netTools.ping(hostname);
                addResult({
                    type: 'info',
                    hostname,
                    message: Lang.format('diagnostics.pingLogs', {hostname}),
                    detail: pingResult
                });
            } catch (originError) {
                const error = CodedError.create(originError, 'NET_PING_FAIL');
                addResult({
                    type: 'error',
                    code: error.code,
                    hostname,
                    detail: error.detailMessage,
                    error
                });
                foundConnectProblem = true;
            }
        }
        const hasPingFail = results.some((result) => result.code === 'NET_PING_FAIL');

        let isSameSubnet = false;
        if (ip && netTools?.isSameSubnet) {
            isSameSubnet = netTools.isSameSubnet(ip);
        }

        // 尝试使用 traceroute 来确定服务器可访问性
        if (dnsLookupResult && !isSameSubnet && netTools?.traceroute) {
            try {
                const traceLogs = await netTools.traceroute(hostname, hasPingFail ? 15000 : 0);
                addResult({
                    type: 'info',
                    hostname,
                    message: Lang.format('diagnostics.tracerouteInfo', {hostname}),
                    detail: traceLogs
                });
            } catch (originError) {
                const error = CodedError.create(originError, 'NET_TRACEROUTE_ERROR');
                addResult({
                    type: 'error',
                    code: error.code,
                    hostname,
                    message: Lang.format('diagnostics.tracerouteError', {hostname}),
                    detail: error.detailMessage,
                    error
                });
                foundConnectProblem = true;
            }
        }

        // 尝试连接到 XXD
        if (dnsLookupResult) {
            const serverInfoUrl: string = (loginError as CodedError).getExtras('serverInfoUrl') || user.webServerInfoUrl;
            const controller = createTimeoutAbortController(6 * 1000);
            try {
                const response = await fetch(serverInfoUrl, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
                    body: `data=${JSON.stringify({
                        method: 'sysgetserverinfo',
                        params: [
                            user.serverName,
                            user.account,
                            user.authKeyForServer,
                            user.apiVersion,
                        ],
                        version: Config.pkg.displayVersion || Config.pkg.version,
                        device: Config.system.device || 'desktop',
                        lang: Lang.name
                    })}`,
                    signal: controller.signal
                });
                const data = await response.json();
                const authErrors = new Set([401, 402, 403]);
                const backendErrors = new Set([405]);
                const detail = [
                    `POST to ${serverInfoUrl}`,
                    '    Response:',
                    `        Headers: ${JSON.stringify(response.headers)}`,
                    `        Status: ${response.status} - ${response.statusText}`,
                    `        Body: ${JSON.stringify(data)}`,
                ].join('\n');
                if (response.status === 200) {
                    addResult({
                        type: 'info',
                        hostname,
                        port,
                        serverInfoUrl,
                        message: Lang.format('diagnostics.serverInfo', {serverInfoUrl}),
                        detail,
                        response
                    });
                } else {
                    addResult({
                        type: 'error',
                        code: (authErrors.has(response.status) || backendErrors.has(response.status)) ? `HTTP_STATUS_${response.status}` : 'HTTP_STATUS_ERROR',
                        hostname,
                        port,
                        serverInfoUrl,
                        detail,
                        response
                    });
                    foundConnectProblem = true;
                }
            } catch (originError) {
                const error = originError instanceof CodedError ? originError : CodedError.create(originError);
                const code = error.code === Codes.HTTP_ETIMEDOUT ? Codes.HTTP_ETIMEDOUT : (error.code && error.code !== 'HTTP_ERROR') ? `HTTP_${error.code}` : 'HTTP_ERROR';
                addResult({
                    port,
                    hostname,
                    type: 'error',
                    code,
                    url: serverInfoUrl,
                    detail: error.detailMessage,
                    error
                });
                foundConnectProblem = true;
            }
        }
    }

    // 如果没有找到网络问题，则显示原始的错误信息
    if (!foundConnectProblem) {
        addResult({
            time: (loginError as CodedError).time,
            type: 'error',
            code: (loginError as CodedError).code,
            loginError: loginError as CodedError,
            message: Lang.error(loginError),
            detail: `${(loginError as CodedError).message}${(loginError as CodedError).detail ? `\n${(loginError as CodedError).detail}` : ''}`,
            ...(loginError as CodedError).extras
        });
    }

    // 诊断完成
    if (resultsInfo.error > 0 || resultsInfo.warning > 0) {
        addResult({
            type: resultsInfo.error > 0 ? 'error' : 'warning',
            message: Lang.format('diagnostics.endDiagnoseNetworkWithErrors', {
                errorsCount: resultsInfo.error,
                warningsCount: resultsInfo.warning,
            }),
        });
    } else {
        addResult({
            type: 'success',
            message: Lang.string('diagnostics.endDiagnoseNetwork')
        });
    }

    return results;
}
