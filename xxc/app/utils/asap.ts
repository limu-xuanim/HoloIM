// import platform from '../platform';

// TODO: Electron 判断窗口可见与否时，给出的结果并不准确，需要一个更好的方案判断是否能够执行动画帧。
/* eslint-disable arrow-body-style */
/* eslint-disable no-unused-vars */

/**
 * 平台提供的通用界面交互访问对象
 */
// const platformUI = platform.access('ui');

/**
 * 尝试尽快执行 callback，在窗口可见时会使用 requestAnimationFrame，窗口不可见时使用 setTimeout
 * @param callback 回调
 * @returns 请求识别符
 */
export const executeAsap = (callback: () => void): {id: NodeJS.Timeout; type: string;} => {
    // if (!platformUI.isWindowVisible || platformUI.isWindowVisible()) {
    //     return {id: requestAnimationFrame(callback), type: 'frame'};
    // }
    return {id: setTimeout(callback, 0), type: 'timeout'};
};

/**
 * 尝试取消尽快执行请求
 * @param identifier 请求识别符
 */
export const cancelAsap = (identifier: NodeJS.Timeout) => {
    // if (identifier.type === 'frame') {
    //     return cancelAnimationFrame(identifier.id);
    // }
    return clearTimeout(identifier);
};
