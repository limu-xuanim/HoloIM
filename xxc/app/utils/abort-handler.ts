/**
 * 异步取消控制器
 */
export default class AbortHandler {
    /**
     * 是否已经取消
     */
    private aborted = false;

    /**
     * 取消时的回调函数
     */
    private abortCallback: (() => void) | null = null;

    /**
     * 是否已经取消
     */
    get isAborted(): boolean {
        return this.aborted;
    }

    /**
     * 设置取消时的回调函数
     * @param callback 取消时的回调函数
     */
    onAbort(callback: () => void) {
        this.abortCallback = callback;
    }

    /**
     * 取消操作
     */
    abort() {
        if (this.abortCallback) {
            this.abortCallback();
        }
        this.aborted = true;
    }
}

/**
 * 创建一个超时取消的控制器
 * @param timeout 超时时间，单位毫秒
 * @returns 控制器
 */
export const createTimeoutAbortController = (timeout: number) => {
    const controller = new AbortController();
    setTimeout(() => {
        controller.abort();
    }, timeout);
    return controller;
};
