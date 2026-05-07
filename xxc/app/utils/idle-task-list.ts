interface RequestOptions {
    params?: any[];
    onComplete?: (arg0: Error, arg1?: any) => void;
    name?: string;
    timeout?: number
}

interface Task extends RequestOptions {
    id: number;
}

/**
 * 空闲回调管理器
 */
export default class IdleTaskList {
    private tasks: Map<number, Task> = new Map();

    /**
     * 获取等待执行的回调个数
     */
    get size() {
        return this.tasks.size;
    }

    /**
     * 取消所有等待执行的回调任务
     */
    cancelAll() {
        for (const [id, task] of this.tasks.entries()) {
            window.cancelIdleCallback(id);
            task.onComplete?.(new Error('Idle task canceled.'));
        }
        this.tasks.clear();
    }

    /**
     * 取消指定 ID 的回调任务
     * @param id 回调 ID
     * @returns 如果取消成功则返回 true
     */
    cancel(id: number): boolean {
        const task = this.tasks.get(id);
        if (!task) {
            return false;
        }

        this.tasks.delete(id);
        window.cancelIdleCallback(id);
        task.onComplete?.(new Error('Idle task canceled.'));
        return true;
    }

    /**
     * Requst idle task callback
     * @param callback 回调函数
     * @param options 调用选项
     * @param options.params 调用参数
     * @param options.onComplete 任务完成或遇到错误时的回调函数
     * @param options.name 任务名称
     * @param numberoptions.timeout 任务最多等待时间，单位毫秒
     * @returns 任务 ID
     */
    request(callback: (...args: any[]) => any, options: RequestOptions = {}): number {
        const {
            params = [], onComplete, name, timeout
        } = options;
        const task: Task = {
            id: null, params, onComplete, name, timeout
        };
        const id = window.requestIdleCallback(async () => {
            this.tasks.delete(id);
            try {
                const result = await callback(...task.params);
                onComplete?.(null, result);
            } catch (error) {
                onComplete?.(error);
                if (DEBUG) {
                    console.collapse('Idle Task ERROR', 'redBg', task.name || `#${id}`, 'redPale', String(error), 'red');
                    console.error('error', error);
                    console.log('task', task);
                    console.log('idleTaskList', this);
                    console.groupEnd();
                }
            }
        }, timeout ? {timeout} : {});
        task.id = id;
        this.tasks.set(id, task);
        return id;
    }

    /**
     * Requst idle task callback and wait result with return a promise
     * @param callback 回调函数
     * @param options 调用选项
     * @param options.params 调用参数
     * @param options.onComplete 任务完成或遇到错误时的回调函数
     * @param options.name 任务名称
     * @param options.timeout 任务最多等待时间，单位毫秒
     * @returns 使用 Promise 异步返回处理结果
     */
    requestAndWait<T = any>(callback: ((...args: any[]) => any), options: RequestOptions = {}): Promise<T> {
        const {onComplete, ...otherOptions} = options;
        return new Promise((resolve, reject) => {
            this.request(callback, {
                ...otherOptions,
                onComplete: (error, result) => {
                    onComplete?.(error, result);
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(result);
                }
            });
        });
    }
}
