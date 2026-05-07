import {OSType} from '~/app/constants';

/**
 * 浏览器 userAgent 字符串
 */
const {userAgent} = window.navigator;

/**
 * 当前运行的操作系统是否是 Mac
 */
const isOSX: boolean = userAgent.includes('Mac OS');

/**
 * 当前运行的操作系统是否是 Windows
 */
const isWindowsOS: boolean = userAgent.includes('Windows');

/**
 * 当前运行的操作系统是否是 Linux
 */
const isLinux: boolean = userAgent.includes('Linux');

const osPlatform = (() => {
    if (isOSX) {
        return OSType.mac;
    }
    if (isWindowsOS) {
        return OSType.win;
    }
    return OSType.linux;
})();


/**
 * 当前操作系统运行环境信息
 * @property {string} os 操作系统类型，包括 MacOS(`'mac'`)，Windows(`'win'`) 或 Linux(`'linux'`)
 * @property {boolean} isWindowsOS 当前运行的操作系统是否是 Windows
 * @property {boolean} isOSX 当前运行的操作系统是否是 Mac OS
 * @property {boolean} isLinux 当前运行的操作系统是否是 Linux
 */
export default {
    os: osPlatform,
    isWindowsOS,
    isOSX,
    isLinux,
};
