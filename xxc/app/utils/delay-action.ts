/**
 * 延时操作类
 */
export default class DelayAction<T extends AnyFunction> {
    /** 操作函数 */
    private action: T;

    /** 延迟时间，单位毫秒 */
    private delay: number;

    /** 操作完成时的回调函数 */
    private callback: ((result: ReturnType<T>) => void) | null;

    /**  操作是否完成 */
    private done: boolean;

    /** 是否使用 requestIdleCallback 执行任务 */
    private idle: boolean;

    /** 任务 ID */
    private actionCallTask: NodeJS.Timeout | null = null;

    /**
     * 创建一个延时操作类实例
     * @param action 延时操作函数
     * @param delay 延迟时间，单位毫秒
     * @param callback 操作完成时的回调函数
     * @param idle 是否使用 requestIdleCallback 执行任务
     */
    constructor(action: T, delay = 100, callback: ((result: ReturnType<T>) => void) | null = null, idle = false) {
        this.action = action;
        this.delay = delay;
        this.callback = callback;
        this.done = false;
        this.idle = idle;
    }

    /**
     * 开始执行延时操作
     * @param params 操作函数参数
     */
    do(...params: Parameters<T>) {
        this.done = false;
        this.cancel();
        this.actionCallTask = setTimeout(() => {
            if (this.idle) {
                window.requestIdleCallback(() => {
                    this.doIm(...params);
                });
            } else {
                this.doIm(...params);
            }
        }, this.delay);
    }

    /**
     * 取消任务
     */
    cancel() {
        if (this.actionCallTask) {
            clearTimeout(this.actionCallTask);
        }
        this.actionCallTask = null;
    }

    /**
     * 立即执行操作（没有延时）
     * @param params 操作函数参数
     */
    doIm(...params: Parameters<T>) {
        const actionResult: ReturnType<T> = this.action(...params);
        this.actionCallTask = null;
        this.callback?.(actionResult);
        this.done = true;
    }

    /**
     * 操作是否已经完成
     */
    get isDone(): boolean {
        return this.done;
    }
}
