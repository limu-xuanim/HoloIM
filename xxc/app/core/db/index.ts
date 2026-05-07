import {createAndOpenDatabase} from './database';

type DBInitFunc = (userIdentify: string) => void;
type DBBusyStatusChangeFunc = (isBusy: boolean) => void;

/**
 * 当前数据库实例
 */
let db: Database | null = null;

/**
 * 数据库初始化时的回调函数
 */
const initCallbacks: DBInitFunc[] = [];

/**
 * 数据库正忙任务计数器
 */
let busyTaskCount = 0;

/**
 * 数据库正忙状态变更回调函数
 */
const busyStatusChangedCallbacks: DBBusyStatusChangeFunc[] = [];

/**
 * 检查数据库是否正忙
 * @returns 如果正忙返回 true
 */
export function isDBBusy() {
    return busyTaskCount > 0;
}

/**
 * 修改数据库正忙任务数
 * @param decrease 是否为减少
 */
function changeDBBusyTask(decrease = false) {
    const isBusyBefore = isDBBusy();

    if (decrease) {
        busyTaskCount = Math.max(0, busyTaskCount - 1);
    } else {
        busyTaskCount += 1;
    }

    const isBusyAfter = isDBBusy();
    if (isBusyBefore !== isBusyAfter && busyStatusChangedCallbacks.length) {
        for (const cb of busyStatusChangedCallbacks) {
            cb(isBusyAfter);
        }
        busyStatusChangedCallbacks.length = 0;
    }
}

/**
 * 开始数据库正忙任务
 */
export const beginDBBusyTask = () => changeDBBusyTask();

/**
 * 结束数据库正忙任务
 */
export const endDBBusyTask = () => changeDBBusyTask(true);

/**
 * 监听数据库正忙状态变更
 * @param callback 回调函数
 */
export function onceDBBusyStatusChanged(callback: DBBusyStatusChangeFunc) {
    if (!busyStatusChangedCallbacks.includes(callback)) {
        busyStatusChangedCallbacks.push(callback);
    }
}

/**
 * 等待数据库不在正忙
 * @returns 异步返回结果
 */
export function waitDBNotBusy() {
    if (!isDBBusy()) {
        return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
        onceDBBusyStatusChanged(() => resolve());
    });
}

/**
 * 初始化用户数据库
 * @param userIdentify 用户或用户标识
 * @returns 使用 Promise 异步返回处理结果
 */
export const initUserDB = async (userIdentify: string): Promise<Database> => {
    PERF_MARK('databaseInitBegin');

    await waitDBNotBusy();

    db = await createAndOpenDatabase(userIdentify);

    for (const cb of initCallbacks) {
        cb(userIdentify);
    }

    PERF_MARK('databaseInitEnd', 'databaseInitBegin', 'databaseInitTime');
    return db;
};

/**
 * 注册数据库初始化回调函数
 * @param callback 回调函数
 * @returns 是否注册成功，如果返回 `false`，可以已经注册过该回调函数
 */
export const setCallbackOnInitedDB = (callback: DBInitFunc) => {
    if (!initCallbacks.includes(callback)) {
        initCallbacks.push(callback);
        return true;
    }
    return false;
};

export default {
    /**
     * 获取当前数据库实例
     */
    get database() {
        return db;
    },

    get members() {
        return db?.members;
    },

    get chats() {
        return db?.chats;
    },

    get messages() {
        return db?.chatMessages;
    },

    get common() {
        return db?.common;
    }
};

if (DEBUG) {
    global.$getDatabaseTable = () => db;
}
