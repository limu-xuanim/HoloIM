/**
 * 节流函数
 * @param func 待执行函数，使用 bind 自行处理 this 绑定
 * @param delay 时间间隔
 * @returns 节流的待执行函数
 */
export default function throttle(func: (...args: any[]) => void, delay = 1000) {
    let timer: NodeJS.Timeout | null = null;
    let startTime = 0;
    return (...args: any[]) => {
        const curTime = Date.now();
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (curTime - startTime > delay) {
            func(...args);
            startTime = Date.now();
        } else {
            timer = setTimeout(() => {
                func(...args);
            }, curTime - startTime);
        }
    };
}
