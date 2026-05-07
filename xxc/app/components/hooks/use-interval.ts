import {useEffect, useState} from 'react';

/**
 * 注册每分钟回调任务清单
 */
const intervalTasksMap = new Map<symbol, {
    callback:(tick: number) => void;
    intervalMins: number;
    tick: number;
}>();

/**
 * 每分钟递增的计数器
 */
let minuteTick = 0;

/**
 * 回调任务 ID 自增记录
 */
let timerID: NodeJS.Timeout | null = null;

/**
 * 添加每分钟回调任务
 * @param callback 每分钟回调任务
 * @param intervalMins 定时间隔，单位分钟
 * @returns 任务 ID
 */
function addCallback(callback: (tick: number) => void, intervalMins = 1) {
    const id = Symbol('minute-callback-id');
    intervalTasksMap.set(id, {callback, intervalMins, tick: minuteTick});
    if (!timerID) {
        timerID = setInterval(() => {
            minuteTick++;
            for (const task of intervalTasksMap.values()) {
                if ((minuteTick - task.tick) >= task.intervalMins) {
                    task.tick = minuteTick;
                    task.callback(minuteTick);
                }
            }
        }, 60 * 1000);
    }
    return id;
}

/**
 * 移除每分钟回调任务
 * @param id 任务 ID
 */
function removeCallback(id: symbol) {
    intervalTasksMap.delete(id);
    if (!intervalTasksMap.size && timerID) {
        clearInterval(timerID);
        timerID = null;
    }
}

/**
 * 定时请求更新的 Hook，精度为 1 分钟，忽略超过 1 年（即 525,600 分钟）的情况
 * @param intervalMins 定时间隔，单位分钟，默认 1 分钟，忽略超过 1 年（即 525,600 分钟）的情况
 * @returns 每分钟更新的计数
 */
export default function useInterval(intervalMins = 1) {
    const [tick, setTick] = useState(minuteTick);
    useEffect(() => {
        // 忽略超过 1 年（即 525,600 分钟）的情况
        if (!intervalMins || intervalMins >= 525600) {
            return;
        }
        return removeCallback.bind(null, addCallback(setTick, intervalMins));
    }, [intervalMins]);
    return tick;
}
