import Store from '~/app/utils/store';

/**
 * 用户对象在本地存储中存储键值前缀
 */
const KEY_USER_PREFIX = 'USER::';

/**
 * 用户标识字符串清单在本地存储中存储键值前缀
 */
const KEY_USER_LIST = 'USER_LIST';

/**
 * 获取本地存储中保存的所有用户标识字符串清单
 */
export const getAllUsersFromStore = (): Record<string, number> => Store.get(KEY_USER_LIST, {});

/**
 * 根据用户标识字符串获取本地存储中保存的用户对象
 * @param identify 用户标识字符串
 * @returns 保存的用户对象
 */
export const getUserFromStore = (identify: string): ReturnType<User['plain']> => {
    if (!identify) {
        return null;
    }

    const user = Store.get(`${KEY_USER_PREFIX}${identify}`);
    if (user) {
        user.identify = identify;
        user.rememberMe ??= true;
    }
    return user;
};

/**
 * 从本地存储中获取最近一次使用的用户
 * @param excludes 要排除的用户清单
 * @returns 返回找到的用户对象
 */
export const getLastUserFromStore = (excludes?: Set<string>|string[]): ReturnType<User['plain']> => {
    const users = getAllUsersFromStore();
    if (!users) {
        return null;
    }

    const excludesSet = Array.isArray(excludes)
        ? new Set(excludes)
        : excludes;
    let maxTime = 0;
    let maxTimeIdentify: string = null;
    const loginedUsers = Store.get('loginedUsers') ?? {};
    Object.keys(users).forEach(identify => {
        if (excludesSet?.has(identify)) {
            return;
        }

        // 忽略已经在其他窗口中登录的用户,仅在DEBUG模式下生效该逻辑
        if (process.env.HOT && loginedUsers[identify] && loginedUsers[identify] !== process.env.WIN_NAME) {
            return;
        }

        const time = users[identify];
        if (time > maxTime) {
            maxTime = time;
            maxTimeIdentify = identify;
        }
    });
    return maxTimeIdentify ? getUserFromStore(maxTimeIdentify) : null;
};

/**
 * 获取本地存储中保存的所有用户
 * @returns 保存的用户列表
 */
export const getUserListFromStore = () => {
    const users = getAllUsersFromStore();
    const list: ReturnType<User['plain']>[] = [];
    let hasDeletedUser = false;
    Object.keys(users).forEach(identify => {
        const user = getUserFromStore(identify);
        if (user) {
            list.push(user);
        } else {
            delete users[identify];
            hasDeletedUser = true;
        }
    });
    if (hasDeletedUser) {
        Store.set(KEY_USER_LIST, users);
    }
    // Sort user by lastLoginTime
    list.sort((user1, user2) => ((user2.lastLoginTime || 0) - (user1.lastLoginTime || 0)));
    return list;
};

/**
 * 将用户对象保存到本地存储
 * @param user 要保存的用户对象
 */
export const saveUserToStore = (user: User) => {
    const {identify} = user;
    if (!identify) {
        throw new Error('Cannot save user, because user.identify property is not defined.');
    }

    const userData = user.plain();
    if (!userData.rememberMe) {
        delete userData.authKey;
    }

    Store.set(`${KEY_USER_PREFIX}${identify}`, userData);

    const users = getAllUsersFromStore();
    users[identify] = Date.now();
    Store.set(KEY_USER_LIST, users);
};

/**
 * 从本地存储移除指定的用户
 * @param identify 要移除的用户标识字符串或者用户对象
 */
export const removeUserFromStore = (identify: string) => {
    if (!identify) {
        throw new Error('Cannot remove user, because identify is not defined.');
    }

    Store.remove(`${KEY_USER_PREFIX}${identify}`);

    const users = getAllUsersFromStore();
    if (users[identify]) {
        delete users[identify];
        Store.set(KEY_USER_LIST, users);
    }
};

export default {
    allUsers: getAllUsersFromStore,
    getUser: getUserFromStore,
    userList: getUserListFromStore,
    saveUser: saveUserToStore,
    removeUser: removeUserFromStore,
    getLastUser: getLastUserFromStore,
};
