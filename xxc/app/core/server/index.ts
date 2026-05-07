import pkg from '~/app/package.json';
import {FeatureMinVersions} from '~/app/core/server/feature-versions';
import socket from './socket';
import serverHandlers from './server-handlers';
import {createUser, emitUserLogin, emitUserLogout, emitUserReconnect, getCurrentUser, onSwapUser, setCurrentUser} from '../profile';
import {requestServerInfo} from './server-api';
import notice, {requestAttention} from '../notice';
import Config from '../../config';
import {compareVersions} from '../../utils/version';
import {limitTimePromise} from '../../utils/promise';
import {checkClientUpdateInfo} from '../updater';
import CodedError, {Codes} from '../../utils/coded-error';
import membersStore from '../members/members-store';
import {initUserDB} from '../db';
import platform from '../../platform';
import Lang from '../lang';
import {getDeviceID} from '../ui/device';
import type {MemberStatusName} from '~/app/core/members/member';
import {LoginMode} from '~/app/constants';

/**
 * 判定服务器请求超时时间，单位毫秒
 */
const TIMEOUT = Config.system['http.timeout'] || 30000;

// 监听切换用户事件，在切换用时关闭以连接的 Socket 连接
// https://developer.mozilla.org/zh-CN/docs/Web/API/CloseEvent
onSwapUser(() => {socket.close(1000, 'swap user');});

/**
 * 检查服务器版本是否受支持
 * @param serverVersion 服务器版本
 * @returns 返回版本是否支持及不支持的原因
 */
const checkServerVersion = (serverVersion: string): [boolean, CodedError | null] => {
    if (!serverVersion) {
        return [false, new CodedError(Codes.SERVER_VERSION_UNKNOWN)];
    }
    if (serverVersion[0].toLowerCase() === 'v') {
        serverVersion = serverVersion.substring(1);
    }
    if (compareVersions(serverVersion, FeatureMinVersions.MIN_SUPPORT_VERSION) < 0) {
        console.warn(`The server version '${serverVersion}' not support, require the min version '${FeatureMinVersions.MIN_SUPPORT_VERSION}'.`);
        return [false, new CodedError(Codes.SERVER_VERSION_NOT_SUPPORT, {
            version: Config.pkg.displayVersion,
            serverVersion,
            minSupportVersion: FeatureMinVersions.MIN_SUPPORT_VERSION
        })];
    }
    return [true, null];
};

/**
 * 获取登录验证字符串
 * @param deviceType 设备类型
 * @param deviceID 设备ID
 * @returns token
 */
export async function getAuthToken(deviceType = '', deviceID = ''): Promise<string> {
    try {
        const resp = await socket.sendAndListen({
            method: 'usergetauthtoken',
            params: [deviceType, deviceID]
        }, true);
        return resp?.data;
    } catch (_) {
        return '';
    }
}

/**
 * 请求新的登录 token
 * @param device 设备类型
 * @param deviceID 设备 ID
 * @returns token
 */
export async function renewAuthToken(device = Config.system.device, deviceID = getDeviceID()): Promise<string> {
    try {
        const resp = await socket.sendAndListen({
            method: 'userrenewauthtoken',
            params: [device, deviceID]
        }, true);
        return resp?.data;
    } catch (_) {
        return null;
    }
}

/**
 * 用户验证 Token 检查定时器
 */
let userAuthTokenCheckTimer: NodeJS.Timeout = null;

/**
 * 停止检查用户验证 Token 是否过期
 */
const stopCheckUserAuthToken = () => {
    if (userAuthTokenCheckTimer) {
        clearTimeout(userAuthTokenCheckTimer);
        userAuthTokenCheckTimer = null;
    }
};

/**
 * 检查用户验证登录 Token 是否过期并尝试续期
 * @param user 用户对象
 */
const checkAndRenewUserAuthToken = async (user = getCurrentUser()) => {
    stopCheckUserAuthToken();

    if (!user || !user.hasAuthToken) {
        return;
    }

    if (user.isAuthTokenNeedRenew) {
        const token = await renewAuthToken();
        user.setAuthToken(token);
        user.tokenNeedRenew = false;
        user.save();
    }

    userAuthTokenCheckTimer = setTimeout(() => checkAndRenewUserAuthToken(), 3600 * 12 * 1000);
};

/**
 * 登录到服务器
 * @param user 要登录的用户
 * @param mode 登录方式
 * @param timeout 登录超时时间
 * @returns 使用 Promise 异步返回处理结果
 */
export const login = (user: User|any, mode: ValueOf<typeof LoginMode> = LoginMode.normal, timeout = TIMEOUT): Promise<User> => {
    try {
        user = createUser(user);
    } catch (error) {
        return Promise.reject(new CodedError(Codes.USER_INVALID, 'User info is not valid.', {user}));
    }

    const isSilentMode = mode === LoginMode.silent;
    const isSimpleMode = mode === LoginMode.simple;
    const isNormalMode = mode === LoginMode.normal;
    if (isNormalMode) {
        setCurrentUser(user);
    }

    if (DEBUG) {
        console.collapse('Server.login', 'tealBg', `[${mode}] ${user.identify}`, 'tealPale');
        console.log('user', user);
        console.log('user.isLogging', user.isLogging);
        console.trace('mode', mode);
        console.groupEnd();
    }
    if (!user) {
        return Promise.reject(new CodedError(Codes.USER_INVALID, 'User is not set.', {user}));
    }
    if (user.isLogging) {
        return Promise.reject(new CodedError(Codes.BUSY, 'Last login request not finish, please wait a minute.', {user}));
    }
    if (isSimpleMode && !user.isVerified) {
        return Promise.reject(new CodedError(Codes.USER_INVALID, 'User is not verified before reconnect.', {user}));
    }

    // 标记后台登录开始
    user.beginLogin();

    return limitTimePromise(requestServerInfo(user), timeout)
        .then(() => initUserDB(user.identify))
        .then(() => {
            const [_, versionError] = checkServerVersion(user.serverVersion);
            if (versionError) {
                return Promise.reject(versionError);
            }
            const updateInfo = checkClientUpdateInfo(user);
            if (updateInfo.needUpdateForce) {
                return Promise.reject(new CodedError(Codes.CLIENT_REQUIRE_UPDATE, `The server required a newer version client '${user.clientUpdate.version}', current version is '${pkg.version}'.`, {version: pkg.version}));
            }
            user.setVersionSupport();
            return new Promise((resolve, reject) => {
                let isLoginFinished = false;
                socket.login(user, {
                    usePing: !isSilentMode && compareVersions(user.serverVersion, FeatureMinVersions.MIN_PING_INTERVAL_VERSION) >= 0,
                    onClose: (_, code: number, reason: string, unexpected: boolean) => {
                        notice.update();
                        emitUserLogout(user, code, reason, unexpected);
                        if (!isLoginFinished) {
                            isLoginFinished = true;
                            reject(new CodedError(Codes.SOCKET_CLOSED, 'Socket connection is unexpectedly disconnected when logging in, usually because the server encountered an unhandled error.'));
                        }
                    }
                }, isSimpleMode).then(result => {
                    if (!isLoginFinished) {
                        isLoginFinished = true;
                        resolve(result);
                    }
                    return result;
                }).catch(error => {
                    if (!isLoginFinished) {
                        isLoginFinished = true;
                        reject(error);
                    }
                    return error;
                });
            });
        })
        .then(async () => {
            try {
                await platform.call('docCookies.set', user.sidCookieInfo);
                await platform.call('docCookies.set', user.sidCookieInfoWithoutUserId);
                user.sidCookieUpdate = Date.now();
                if (DEBUG) {
                    console.log('Session cookie setted', {
                        ...user.sidCookieInfo, time: user.sidCookieUpdate, sessionID: user.sessionID, userID: user.id
                    });
                }
            } catch (error) {
                if (DEBUG) {
                    console.error('Error when set cookie', user, error);
                }
            }
        })
        .then(() => membersStore.loadRecentAccessMembersFromDatabase())
        .then(() => {
            user.endLogin(true);
            user.save();
            membersStore.store(user);
            checkAndRenewUserAuthToken();
            if (Config.ui.defaultUser) {
                platform.call('buildIn.removeDefaultUser');
            }
            if (!isSilentMode) {
                emitUserLogin(user, null, isSimpleMode);
                if (isSimpleMode) {
                    emitUserReconnect(user);
                }
            }
            return Promise.resolve(user);
        })
        .catch(originError => {
            if (originError.code !== 'BACKEND_SERVER_ERROR') {
                const error = CodedError.create(originError);
                error.setExtras({user});
                const isIdentifyFailed = ['HTTP_STATUS_401', Codes.INVALID_TOKEN].includes(error.code);
                user.endLogin(false, isIdentifyFailed);
                if (!isSilentMode) {
                    emitUserLogin(user, error, isSimpleMode);
                }
                return Promise.reject(error);
            }
            return Promise.reject();
        }).finally(() => {
            if (user.isLogging) {
                user.endLogin(false);
            }
        });
};

/**
 * 重新登录到服务器
 * @returns 使用 Promise 异步返回处理结果
 */
export const reconnect = () => {
    const user = getCurrentUser();
    if (user.isOnline) {
        return Promise.resolve(user);
    }
    return login(user, LoginMode.simple);
};

/**
 * 向服务器请求变更用户状态名称
 * @param status 用户状态名称
 * @returns 使用 Promise 异步返回处理结果
 */
export const changeUserStatus = (status: MemberStatusName) => socket.changeUserStatus(status);

/**
 * 修改用户密码
 * @param password 新的密码
 * @returns 使用 Promise 异步返回处理结果
 */
export const changeUserPassword = (password: string): Promise<any> => socket.changeUserPassword(password);

/**
 * 退出登录
 * @param unexpected 是否为意外退出
 */
export const logout = async (unexpected = false) => {
    stopCheckUserAuthToken();
    const currentUser = getCurrentUser();
    if (currentUser && DEBUG) {
        console.collapse('Server.logout', 'tealBg', currentUser.identify, 'tealPale');
        console.trace('currentUser', currentUser);
        console.groupEnd();
    }

    if (unexpected) {
        notice.update({
            tray: {
                text: Lang.string('member.status.disconnect')
            }
        });
    }

    socket.logout();

    if (currentUser) {
        currentUser.markUnverified();
    }

    if (unexpected) {
        requestAttention('critical');
        platform.call('ui.showAndFocusWindow');
    }
};

// 设置默认通话处理函数
socket.setHandlers(serverHandlers);

export default {
    login,
    reconnect,
    logout,
    socket,
    changeUserStatus,
    changeUserPassword
};
