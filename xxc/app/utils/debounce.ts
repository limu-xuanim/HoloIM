/**
 * 快捷去抖
 * @param func 待执行函数，使用 bind 自行处理 this 绑定
 * @param wait 等待时间，单位毫秒，默认 1000
 * @returns 返回去抖后的函数
 */
export default function debounce(func: (...args: any[]) => void, wait = 1000) {
    let timer: NodeJS.Timeout | null = null;

    return (...args: any[]) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            func(...args);
            timer = null;
        }, wait);
    };
}
