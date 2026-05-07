/**
 * 等待指定的时间
 * @param timeout 超时事件
 */
export default function delay(timeout: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}
