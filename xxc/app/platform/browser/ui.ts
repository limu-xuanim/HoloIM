/**
 * 打开外部链接，在浏览器平台上处理方式是通过打开新标签页实现
 * @param link 要打开的链接
 * @returns 窗口
 */
export const openExternal = (link: string) => window.open(link);

/**
 * 判断网页是否获得焦点
 * @returns 如果返回 `true` 则为获得焦点，否则为没有获得焦点
 */
const isDocumentHasFocus = (): boolean => window.document.hasFocus();

/**
 * 保存所有窗口激活回调函数
 */
const windowFocusHandlers: (() => void)[] = [];

/**
 * 保存上次判断的窗口是否激活
 */
let isWindowHasFocus = isDocumentHasFocus();

/**
 * 检查窗口是否激活
 */
const checkWindowHasFocus = () => {
    const isHasFocus = isDocumentHasFocus();
    if (isHasFocus !== isWindowHasFocus) {
        if (isHasFocus) {
            for (const func of windowFocusHandlers) {
                func();
            }
        }
    }
    isWindowHasFocus = isHasFocus;
};

// 定期检查窗口激活状态
setInterval(checkWindowHasFocus, 300);

/**
 * 绑定应用窗口激活事件
 * @param listener 事件回调函数
 */
export const onWindowFocus = (listener: () => void) => {
    windowFocusHandlers.push(listener);
};

/**
 * 当前应用窗口是否打开
 * 在浏览器平台上此值永远返回 `true`
 * @returns true
 */
export const isWindowOpen = () => true;

/**
 * 当前应用窗口是否打开并且激活
 * @returns 如果返回 `true` 则为打开并且激活，否则为没有打开并且激活
 */
export const isWindowOpenAndFocus = isDocumentHasFocus;

/**
 * 当前应用窗口是否处于激活状态
 * @returns 如果返回 `true` 则为处于激活状态，否则为没有处于激活状态
 */
export const isWindowFocus = isDocumentHasFocus;

/**
 * 获取当前窗口缩放比率
 * @returns 缩放比率
 */
export const getZoomFactor = (): number => {
    const zoom = Number.parseFloat(document.documentElement.style.zoom);
    return Number.isNaN(zoom) ? 1 : zoom;
};

/**
 * 设置当前窗口缩放比率
 * @param factor 缩放比率
 */
export const setZoomFactor = (factor: number) => {
    document.documentElement.style.zoom = String(factor || 1);
};

export default {
    openExternal,
    isWindowOpenAndFocus,
    isWindowFocus,
    isWindowOpen,
    onWindowFocus,
    getZoomFactor,
    setZoomFactor
};
