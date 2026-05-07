import {EventChannel} from '~/app/utils/event-channel';

export type FetchingTask = {
    chats: string[];
    startDate: number;
    progress: number;
    isFetching: boolean;
    recPerPage: number;
    onProgress: (progress: number, task: FetchingTask) => void;
};

/**
 * 消息记录获取进度变更事件
 */
const EVENT_HISTORY_PROGRESS = Symbol('EVENT_HISTORY_PROGRESS');

/**
 * 消息记录获取开始事件
 */
const EVENT_HISTORY_START = Symbol('EVENT_HISTORY_START');

/**
 * 消息记录获取结束事件
 */
const EVENT_HISTORY_FINISH = Symbol('EVENT_HISTORY_FINISH');

/**
  * 取消同步历史记录信号
  */
let abortSyncSignal = false;

/**
 * 获取取消同步历史记录信号
 * @returns 信号
 */
export const getAbortSyncSignal = () => abortSyncSignal;

/**
  * 取消同步历史记录
  */
export const abortSyncHistory = () => {abortSyncSignal = true;};

/**
  * 重置取消同步历史记录信号
  */
export const resetAbortSyncSignal = () => {abortSyncSignal = false;};

/**
  * 消息获取事件管理对象
  */
const _fetchingChannel = new EventChannel({delayTime: 0});

/**
 * 绑定消息记录获取开始事件
 * @param listener 事件回调函数
 * @returns 事件 ID
 */
export const onStartFetchingHistory = (listener: (task: FetchingTask) => void) => _fetchingChannel.subscribe(EVENT_HISTORY_START, listener);

/**
 * 触发消息记录获取开始事件
 * @param task 任务
 */
export const emitStartFetchingHistory = (task: FetchingTask) => _fetchingChannel.publish(EVENT_HISTORY_START, task);

/**
 * 绑定消息记录获取完成事件
 * @param listener 事件回调函数
 * @returns 事件 ID
 */
export const onFinishFetchingHistory = (listener: (task: FetchingTask) => void) => _fetchingChannel.subscribe(EVENT_HISTORY_FINISH, listener);

/**
 * 触发消息记录获取完成事件
 * @param task 任务
 */
export const emitFinishFetchingHistory = (task: FetchingTask) => _fetchingChannel.publish(EVENT_HISTORY_FINISH, task);

/**
 * 绑定消息记录获取进度变更事件
 * @param listener 事件回调函数
 * @returns 事件 ID
 */
export const onFetchingHistoryProgress = (listener: (progress: number, task: FetchingTask) => void) => _fetchingChannel.subscribe(EVENT_HISTORY_PROGRESS, listener);

/**
 * 触发消息记录获取进度变更事件
 * @param progress 进度
 * @param task 任务
 */
export const emitFetchingHistoryProgress = (progress: number, task: FetchingTask) => _fetchingChannel.publish(EVENT_HISTORY_PROGRESS, progress, task);

/**
  * 绑定消息记录获取更新事件
  * @param listener 事件回调函数
  * @returns 事件 ID
  */
export const onFetchingHistory = (listener: () => void) => _fetchingChannel.subscribeAny(listener);

/**
  * 取消绑定消息记录获取事件
  * @param subscriberID 订阅 ID
  * @returns 如果为 true 则取消订阅成功
  */
export const offFetchingHistoryEvent = (...subscriberIDs: symbol[]) => _fetchingChannel.unsubscribe(subscriberIDs);
