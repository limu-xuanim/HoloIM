import {registerCommand} from '../commander';
import {chatsStore} from '~/app/entries/vars/chatsStore';
import {ChatMessagesStoreModule} from '~/app/entries/vars/ChatMessagesStoreModule';
import {resetAbortSyncSignal,
    getAbortSyncSignal,
    emitStartFetchingHistory,
    emitFetchingHistoryProgress,
    emitFinishFetchingHistory,
    type FetchingTask,
} from './fetch-history-events';
import type {Pager} from './chat-messages-store';

const {default: chatMessagesStore} = ChatMessagesStoreModule;

/**
 * 消息记录获取任务
 */
let _fetchingTask: FetchingTask | null = null;

/**
 * 获取当前消息记录获取任务
 * @returns 消息记录获取任务对象
 */
export const getFetchingTask = () => _fetchingTask;

/**
 * 异步获取会话消息记录
 * @param options 选项
 * @param options.chats 要获取的会话 GID 列表，如果为空，则获取所有会话，如果为 groups 则获取所有讨论组，如果为 contacts 则获取所有一对一会话
 * @param options.startDate 消息记录的最早日期，如果指定为 0，则获取所有时间的消息记录
 * @param options.recPerPage 每次请求获取的消息数目
 * @param options.onStart 开始获取时的回调函数
 * @param options.onProgress 当完成进度变更时的回调函数
 * @param options.onFinish 结束获取时的回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export async function fetchHistory(options: Partial<{
    chats: string;
    startDate: number;
    recPerPage: number;
    onStart: (task: FetchingTask) => void;
    onProgress: (progress: number, task: FetchingTask) => void;
    onFinish: (task: FetchingTask) => void;
}> = {}) {
    if (_fetchingTask) {
        throw new Error('BUSY');
    }

    const {chats: _chats, startDate = 0, recPerPage = 50, onStart, onProgress, onFinish} = options;
    let chats: Array<Chat | Nullish> = [];

    // 预处理 chats 参数
    if (!_chats) {
        chats = chatsStore.getAllChats(false);
    } else if (_chats === 'contacts') {
        chats = chatsStore.getPrivateChats({sortRules: false, excludeLocal: true});
    } else if (_chats === 'groups') {
        chats = chatsStore.getGroupsChats('default', false, true);
    } else if (typeof _chats === 'string') {
        chats = chatsStore.getChats([_chats]);
    }

    if (!chats.length) {
        return;
    }

    const cgids = [];
    for (const chat of chats) {
        if (!chat) {
            continue;
        }
        cgids.push(chat.gid);
    }

    // 创建获取任务
    const fetchingTask: FetchingTask = {
        chats: cgids,
        startDate,
        progress: 0,
        isFetching: false,
        recPerPage,
        onProgress: (progress, task) => {
            onProgress?.(progress, task);
            emitFetchingHistoryProgress(progress, task)
        },
    };

    _fetchingTask = fetchingTask;

    onStart?.(fetchingTask);
    emitStartFetchingHistory(fetchingTask);

    await processFetchTask(fetchingTask);
    _fetchingTask = null;
    resetAbortSyncSignal();

    onFinish?.(fetchingTask);
    emitFinishFetchingHistory(fetchingTask);
    // 同步结束后裁剪参与同步会话的 latestMessageIndexes，避免主窗口长期持有超大列表
    chatMessagesStore.shrinkSyncedChatsMessageLists(fetchingTask.chats);
    return fetchingTask;
}

/**
 * 处理消息记录获取任务
 * @param task 消息记录获取任务
 * @returns 使用 Promise 异步返回处理结果
 */
async function processFetchTask(task: FetchingTask) {
    if (task.isFetching) {
        return task;
    }

    task.isFetching = true;
    task.progress = 0;

    const {
        chats, recPerPage, startDate, onProgress
    } = task;

    const fullProgressForChat = 100 / chats.length;
    const updateFetchProgress = (progress: number, index: number | null = null) => {
        const newProgress = index === null ? progress : index * fullProgressForChat + fullProgressForChat * (progress / 100);
        if (task.progress !== newProgress) {
            task.progress = newProgress;
            onProgress?.(newProgress, task);
        }
    };

    updateFetchProgress(0);
    for (let i = 0; i < chats.length; ++i) {
        if (getAbortSyncSignal()) {
            return;
        }

        const cgid = chats[i];
        updateFetchProgress(0, i);
        await fetchChatHistory(cgid, {
            recPerPage,
            startDate,
            onProgress: (progress) => {
                updateFetchProgress(progress, i);
            }
        });
        updateFetchProgress(100, i);
    }
    updateFetchProgress(100);

    task.isFetching = false;

    return task;
}

/**
 * 获取指定会话的消息记录
 * @param cgid 会话 GID
 * @param options 获取选项
 * @param options.startDate 消息记录的最早日期，如果指定为 0，则获取所有时间的消息记录
 * @param options.recPerPage 每次请求获取的消息数目
 * @param options.onProgress 当完成进度变更时的回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
async function fetchChatHistory(cgid: string, options: Partial<{
    startDate: number;
    recPerPage: number;
    onProgress: (progress: number) => void;
}> = {}) {
    const {startDate = 0, recPerPage = 50, onProgress} = options;

    let pager: number | Pager | null = recPerPage;
    let progress = 0;
    while (pager) {
        if (getAbortSyncSignal()) {
            return;
        }

        const {prevPager, list} = await chatMessagesStore.fetchChatMessagesByPage(cgid, {
            pager,
            reverse: true,
            putToCache: false,
            skipChatFilter: true,
        });

        if (!prevPager || list.some(x => x.date < startDate)) {
            pager = null;
        } else {
            pager = prevPager;
        }

        progress += Math.min(10, (100 - progress) / 3);
        onProgress?.(progress);
    }
    onProgress?.(100);
}

// 注册从服务器获取聊天历史记录命令
registerCommand('fetchChatsHistory', (_, options) => fetchHistory(options), undefined, {apiLevel: 1});
