import Config from '~/app/config';
import Lang from '../lang';
import {createDate} from '~/app/utils/date-helper';
import CodedError, {Codes} from '~/app/utils/coded-error';
import {login} from './index';
import {postJSON} from '~/app/platform/common/network';

/**
 * 将服务器返回的信息罐装到当前登录的用户对象中
 * @param user 用户对象
 * @param data 服务器返回的信息
 * @param url 服务器信息请求地址
 * @returns 处理完毕的用户对象
 */
const dataToUser = (user: User, data: any, url: string) => {
    user.socketPort = data.chatPort;
    user.token = data.token;
    user.serverVersion = data.version.toLowerCase() === 'xxdbuildversion' ? '99.9.9' : data.version;
    user.socketUrl = data.socketUrl;
    user.uploadFileSize = data.uploadFileSize;
    user.backendType = data.backend;
    user.backendURL = data.backendURL;
    user.clientUpdate = data.clientUpdate;
    user.company = data.company;
    user.permissions = data.permissions;
    user.enableClientAES = !!data.enableClientAES;
    user.dismissedGroupLife = data.dismissedGroupLife;
    user.serverTimeOffset = createDate(data.serverTime).getTime() + Math.floor(data.requestConsumedTime / 2) - Date.now();
    if (data.apiScheme) {
        user.apiScheme = data.apiScheme;
    }
    if (url !== user.webServerInfoUrl) {
        user.setServer(url.endsWith('/serverInfo') ? url.substring(0, url.length - 11) : url);
    }
    if (data.authToken) {
        user.setAuthToken(data.authToken);
    }
    if (data.authTokenLifetime) {
        user.setAuthTokenConfig(data.authTokenLifetime, data.authTokenAuthWindow);
    }
    if (data.tokenNeedRenew) {
        user.tokenNeedRenew = true;
    }
    if (data.requestType) {
        user.requestType = data.requestType;
    }
    if (data.requestFix) {
        user.requestFix = data.requestFix;
    }
    if (data.stunPort) {
        user.stunPort = data.stunPort;
    }
    if (data.iceServers) {
        user.iceServers = data.iceServers;
    }
    return user;
};

/**
 * 登录前向 XXD 服务器请求获取服务器信息
 * @param url 请求地址
 * @param postData 请求内容
 * @returns 使用 Promise
 */
const requestServerInfoWithUrl = (url: string, jsonData: object) => postJSON(url, {
    headers: {
        "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(jsonData),
});

/**
 * 构建 ServerInfo 请求参数数据
 * @param user 当前登录的用户
 * @returns 请求参数数据
 */
function buildServerInfoPostData(user: User) {
    return {
        method: 'sysgetserverinfo',
        params: [
            user.serverName,
            user.account,
            user.authKeyForServer,
            DEBUG ? '' : user.apiVersion,
        ],
        version: Config.pkg.displayVersion || Config.pkg.version,
        device: Config.system.device || 'desktop',
        lang: Lang.name,
    } as const;
}

/**
 * 登录前向 XXD 服务器请求获取服务器信息
 * @param user 当前登录的用户
 * @returns 使用 Promise 异步返回处理结果
 */
export const requestServerInfo = async (user: User) => {
    PERF_MARK('serverInfoBegin');
    const authErrors = new Set(['HTTP_STATUS_401', 'HTTP_STATUS_402', 'HTTP_STATUS_403']);
    const backendErrors = new Set(['HTTP_STATUS_405']);
    const {possibleServerInfoUrls} = user;

    const errors = [];
    let primaryError: CodedError | null = null;
    let backendServerError = false;
    for (const url of possibleServerInfoUrls) {
        try {
            const startRequestTime = Date.now();

            const data = await requestServerInfoWithUrl(url, buildServerInfoPostData(user));
            if (!data) {
                throw new CodedError(Codes.HTTP_DATA_ERROR, 'Empty data.');
            }
            if (!data.token) {
                throw new CodedError(Codes.HTTP_DATA_ERROR, data.message || 'Server token is empty.');
            }
            data.requestConsumedTime = Date.now() - startRequestTime;
            user = dataToUser(user, data, url);
            PERF_MARK('serverInfoEnd', 'serverInfoBegin', 'serverInfoTime');
            return user;
        } catch (originError) {
            const error = CodedError.create(originError);
            const originExtras = error.getExtras();

            if (originExtras && originExtras.responseText) {
                // 尝试将 serverInfo 响应对内容作为 JSON 处理
                try {
                    if (typeof originExtras.responseText === 'string'
                    && /Verify authentication credentials error: \[VerifyLogin\] backend server \[.*\] cannot found\. \n/.test(originExtras.responseText)) {
                        backendServerError = true;
                        const loginUserData = {
                            server: user.serverUrlRoot,
                            account: user.account,
                            authKey: user.authKey,
                            rememberMe: user.rememberMe,
                            autoLogin: user.autoLogin,
                        };
                        user.endLogin(false, true);
                        login(loginUserData);
                    }
                    const response = JSON.parse(originExtras.responseText);
                    if (response && typeof response === 'object') {
                        if (response.message) {
                            error.message = response.message;
                            error.code = response.code || response.data === 'Invalid Token.' ? Codes.INVALID_TOKEN : 'SER_ERR';
                        }
                        primaryError = error;
                        errors.push(error);
                        break;
                    }

                } catch {}
            }

            error.setExtras({serverInfoUrl: url});
            errors.push(error);
            if (authErrors.has(error.code) || backendErrors.has(error.code)) {
                primaryError = error;
                break;
            }
        }
    }
    if (errors.length && !backendServerError) {
        if (!primaryError) {
            primaryError = errors[0];
        }
        primaryError = CodedError.create(primaryError);
        if (errors.length > 1) {
            const attemptsDetail: string[] = [];
            const attempts: CodedError[] = [];
            errors.forEach((error, index) => {
                if (error === primaryError) {
                    return;
                }
                attemptsDetail.push(
                    `Attempt #${index}:`,
                    `    [${error.code}] ${(error.message && error.message !== `[${error.code}]`) ? error.message : ''}`,
                );
                const {detail, stack} = error;
                if (detail) {
                    attemptsDetail.push(`Detail: ${error.detail}`);
                }
                if (stack) {
                    attemptsDetail.push(`Stack: ${error.stack}`);
                }
                attemptsDetail.push('\n');
                attempts.push(error);
            });

            primaryError.setExtras({attemptsDetail: attemptsDetail.join('\n')});
            primaryError.setExtras({attempts});
        }
        PERF_MARK('serverInfoEndWithError', 'serverInfoBegin', 'serverInfoTime');
        throw primaryError;
    }
    PERF_MARK('serverInfoEnd', 'serverInfoBegin', 'serverInfoTime');
    if (backendServerError) {
        throw new CodedError(Codes.BACKEND_SERVER_ERROR);
    }
};
