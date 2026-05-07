/**
 * 创建一个限时 Promise，超过一定的时间，如果传入的 Promise 仍然未能执行成功则返回的 Promise 直接失败
 *
 * @param promise 要执行的 Promise
 * @param timeout 限时，单位毫秒
 * @param timeoutError 超时出错信息
 * @returns 返回一个新的 Promise
 */
export function limitTimePromise<T>(promise: Promise<T>, timeout = 15000, timeoutError: Error | (() => Error) | null = null): Promise<T> {
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => {
            const error = typeof timeoutError === 'function'
                ? timeoutError()
                : (timeoutError ?? new Error('[TIMEOUT]'));
            reject(error);
        }, timeout);
    });

    return Promise.race([promise, timeoutPromise]);
}

/**
 * 判断一个对象是不是Promise
 * @param obj 判断一个对象是不是Promise
 * @returns 是不是Promise
 */
export function isPromise(obj: any):boolean {
    return (typeof obj === 'object' && typeof obj.then === 'function');
}
