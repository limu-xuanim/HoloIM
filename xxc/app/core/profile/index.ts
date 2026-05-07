import {Subject} from 'rxjs';
import User from './user';
import Lang from '../lang';
import {updateUserInfoOnTray} from '../notice';
import {getUserFromStore, getLastUserFromStore} from './user-store';
import type {UserLike} from './user';
import type {DeviceType} from '~/app/constants';
import type CodedError from '~/app/utils/coded-error';
import type {AllUserConfig} from './user-config';


const userSwapSubject = new Subject<[User, boolean]>();

const userLoginSubject = new Subject<[User, CodedError, boolean]>();

const userLogoutSubject = new Subject<[User, number, string, boolean]>();

const userLoginOnOtherDeviceSubject = new Subject<ValueOf<typeof DeviceType>>();

const userReconnectSubject = new Subject<User>();

const userAutoLoginSubject = new Subject<AutoLoginResult>();

enum AutoLoginResult {
    success = 'success',
    fail = 'fail',
    skip = 'skip',
}

/**
 * 存储当前登录的用户实例
 */
let user: User | null = null;

/**
 * 创建用户实例
 * @param userData 用户存储数据对象
 * @returns 用户对象
 */
export const createUser = (userData: UserLike|User): User => {
    if (userData instanceof User) {
        return userData;
    }

    const identify = User.createIdentify(userData.server, userData.account);
    userData = {...getUserFromStore(identify), ...userData} as UserLike;
    const newUser = new User(userData);
    if (userData.authKey !== undefined) {
        newUser.authKey = userData.authKey;
    }
    if (userData.server !== undefined) {
        newUser.setServer(userData.server);
    }
    return newUser;
};

/**
 * 设置当前登录的用户实例
 * @param newUser 新的用户实例
 * @returns 用户对象
 */
export const setCurrentUser = (newUser: User): User => {
    if (!(newUser instanceof User)) {
        throw new Error('Cannot set user for profile, because the user param is not User instance.');
    }

    const oldUser = user;
    oldUser?.destroy();
    user = newUser;
    user.enableEvents();

    if (DEBUG) {
        console.collapse('Profile.setUser', 'tealBg', user.identify, 'tealPale');
        console.log('user', user);
        console.groupEnd();
    }

    const isDiff = !oldUser || oldUser.identify !== user.identify;
    updateUserInfoOnTray(user);
    userSwapSubject.next([user, isDiff]);
    return user;
};

/**
 * 绑定切换当前用户事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onSwapUser = (listener: (next: [user: User, isDiff: boolean]) => void) => userSwapSubject.subscribe(listener);

/**
 * 获取上次保存的用户数据
 * @param excludes 要排除的用户清单
 * @returns 返回找到的用户对象
 */
export const getLastSavedUser = getLastUserFromStore;

/**
 * 判定给定的用户或成员是否是当前登录用户
 * @param theUser 要判断的用户或成员实例
 * @returns 如果为 `true`，表示为当前用户，否则不是当前用户
 */
export const isCurrentUser = (userID: number) => {
    if (!user) {
        return false;
    }
    return user.id === userID;
};

/**
 * 获取当前登录的用户
 * @returns 当前登录的用户
 */
export const getCurrentUser = () => user;

/**
 * 获取当前登录的用户 ID
 * @returns 当前登录的用户的 ID
 */
export const getCurrentUserID = () => user?.id ?? 0;

/**
 * 获取当前登录的用户名
 * @returns 当前登录的用户名
 */
export const getCurrentUserAccount = () => user?.account;

/**
 * 获取当前登录的用户状态
 * @returns 用户状态代码
 */
export const getUserStatus = () => user?.status;

/**
 * 检查当前登录的用户是否验证通过过
 * @returns 如果为 `true` 则验证通过，否则为没有验证通过
 */
export const isUserVerified = () => Boolean(user?.isVerified);

/**
 * 检查当前登录的用户是否在线
 * @returns 如果为 `true` 则用户在线，否则为不在线
 */
export const isUserOnline = () => Boolean(user?.isOnline);

/**
 * 获取当前用户所有配置
 * @returns 返回整个用户配置
 */
export const getAllUserConfig = () => user?.config;

/**
 * 获取当前用户配置
 * @param configName 配置名称
 * @returns any 返回指定名称的配置
 */
export const getUserConfig = <K extends keyof AllUserConfig>(key: K, value: AllUserConfig[K]) => {
    const config = getAllUserConfig();
    return config?.get(key, value);
};

/**
 * 绑定用户登录事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onUserLogin = (listener: (next: [User, CodedError, boolean]) => void) => userLoginSubject.subscribe(listener);

/**
 * 触发用户登录事件
 * @param user 用户
 * @param error 错误
 * @param isSimpleMode 是否为简单模式
 */
export const emitUserLogin = (user: User, error: CodedError, isSimpleMode: boolean) => userLoginSubject.next([user, error, isSimpleMode]);

/**
 * 绑定用户退出登录事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onUserLogout = (listener: (next: [User, number, string, boolean]) => void) => userLogoutSubject.subscribe(listener);

/**
 * 触发用户注销事件
 * @param user 用户
 * @param code 编码
 * @param reason 原因
 * @param unexpected 是否为意外的
 */
export const emitUserLogout = (user: User, code: number, reason: string, unexpected: boolean) => userLogoutSubject.next([user, code, reason, unexpected])

/**
 * 绑定用户重连事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onUserReconnect = (listener: (user: User) => void) => userReconnectSubject.subscribe(listener);

/**
 * 绑定用户重新登录事件
 * @param user 用户
 */
export const emitUserReconnect = (user: User) => userReconnectSubject.next(user);

/**
 * 绑定用户在其他设备上登录事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onUserLoginOnOtherDevice = (listener: (type: ValueOf<typeof DeviceType>) => void) => userLoginOnOtherDeviceSubject.subscribe(listener);

/**
 * 触发用户在其他设备上登录事件
 * @param deviceType 设备类型
 */
export const emitUserLoginOnOtherDeviceEvent = (deviceType: ValueOf<typeof DeviceType>) => userLoginOnOtherDeviceSubject.next(deviceType);

/**
 * 触发用户自动登录登录事件
 * @param  result 设备类型
 */
export const emitUserAutoLoginEvent = (result: AutoLoginResult) => userAutoLoginSubject.next(result);

/**
 * 绑定用户自动登录事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onUserAutoLogin = (listener: (result: AutoLoginResult) => void) => userAutoLoginSubject.subscribe(listener);

const profile = {
    createUser,
    setCurrentUser,
    onSwapUser,
    getLastSavedUser,
    isCurrentUser,

    /**
     * 获取当前登录的用户实例
     */
    get user() {
        return user;
    },

    /**
     * 获取当前登录的用户 ID
     */
    get userId() {
        return getCurrentUserID();
    },

    /**
     * 检查当前登录的用户是否在线
     */
    get isUserOnline() {
        return isUserOnline();
    },

    /**
     * 检查当前登录的用户是否验证通过过
     */
    get isUserVerified() {
        return isUserVerified();
    },

    /**
     * 获取当前登录的用户状态编号
     */
    get userStatus() {
        return getUserStatus();
    },

    /**
     * 获取当前用户状态描述文本
     */
    get summaryText() {
        if (user) {
            return `${user.displayName} [${Lang.string(`member.status.${user.statusName}`)}]`;
        }
        return '';
    },

    /**
     * 获取当前用户配置对象
     */
    get userConfig() {
        return getAllUserConfig();
    },

    /**
     * 获取当前用户用户名
     */
    get userAccount() {
        return getCurrentUserAccount();
    }
};

if (DEBUG) {
    global.$profile = profile;
}
