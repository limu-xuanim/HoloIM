import {useEffect, useState} from 'react';
import {getFetchingTask} from '~/app/entries/vars/getFetchingTask';
import {FetchHistoryEventsModule} from '~/app/entries/vars/FetchHistoryEventsModule';
import type {FetchingTask} from '~/app/core/im/fetch-history-events';

const {offFetchingHistoryEvent, onFetchingHistory} = FetchHistoryEventsModule

/**
 * 获取消息记录获取状态
 * @returns 消息记录获取状态对象
 */
function getFetchingStatus(): {
    task: FetchingTask | null;
    fetching: boolean;
    progress: number;
} {
    const task = getFetchingTask();
    if (!task) {
        return {
            task: null,
            fetching: false,
            progress: 0,
        };
    }
    return {
        task,
        fetching: task.isFetching,
        progress: task.progress
    };
}

/**
 * 消息记录获取状态 Hook
 * @returns  消息记录获取状态对象
 */
export default function useHistoryFetchingStatus() {
    const [status, setStatus] = useState(() => getFetchingStatus());

    useEffect(() => {
        const eventID = onFetchingHistory(() => setStatus(getFetchingStatus()));
        return () => void offFetchingHistoryEvent(eventID);
    }, []);

    return status;
}
