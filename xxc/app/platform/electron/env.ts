import {OSType} from '~/app/constants';

/**
 * 当前窗口名称
 */
const windowName = process.env.WIN_NAME!;

/**
 * 父级窗口名称
 */
const parentWindowName = process.env.PARENT_WIN_NAME;

/**
 * 当前应用入口名称
 */
const entryName = process.env.ENTRY;

/**
 * 操作系统平台
 */
const OS_PLATFORM = window.nodeAPI.osPlatform();

/**
 * 用户个人数据文件夹路径
 */
const dataPath = window.electronAPI.getPath('userData');

/**
 * 用户临时文件存储路径
 */
const tmpPath = window.nodeAPI.pathJoin(dataPath, 'temp');

/**
 * 用户桌面文件夹路径
 */
const desktopPath = window.electronAPI.getPath('desktop');

/**
 * 当前运行的操作系统是否是 Mac
 */
const isOSX = OS_PLATFORM === 'darwin';

/**
 * 当前运行的操作系统是否是 Windows
 */
const isWindowsOS = OS_PLATFORM === 'win32';

/**
 * 当前运行的操作系统是否是 Linux
 */
const isLinux = !isOSX && !isWindowsOS;

// 将应用路径保存到环境变量
const APP_ROOT = window.electronAPI.getAppPath();
process.env.APP_ROOT = APP_ROOT;

const exePath = window.electronAPI.getPath('exe');

/**
 * 获取 Electron 程序目录
 * @returns Electron 程序目录
 */
export const getElectronRootPath = (): string => {
    if (process.env.HOT) {
        return window.nodeAPI.pathResolve(APP_ROOT, isOSX ? '../xuanxuan.custom.app' : '../xuanxuan.custom');
    }
    if (isOSX) {
        return window.nodeAPI.pathResolve(exePath, '../../../');
    }
    return window.nodeAPI.pathResolve(exePath, '../');
};

/**
 * 当前操作系统运行环境信息
 * @property os 操作系统类型，包括 MacOS(`'mac'`)，Windows(`'win'`) 或 Linux(`'linux'`)
 * @property isWindowsOS 当前运行的操作系统是否是 Windows
 * @property isOSX 当前运行的操作系统是否是 Mac OS
 * @property isLinux 当前运行的操作系统是否是 Linux
 * @property arch 当前运行的操作系统架构类型
 * @property desktopPath 用户桌面文件夹路径
 * @property tmpPath 用户临时文件存储路径
 * @property dataPath 用户个人数据文件夹路径
 * @property appPath Electron 应用文件程序夹路径
 * @property appRoot Electron 应用根目录路径
 */
export default {
    arch: window.nodeAPI.processArch,
    os: isOSX ? OSType.mac : isWindowsOS ? OSType.win : OSType.linux,
    isWindowsOS,
    isOSX,
    isLinux,
    dataPath,
    desktopPath,
    tmpPath,
    get appPath() {
        return window.nodeAPI.pathResolve(APP_ROOT, '..');
    },
    get rootPath() {
        return getElectronRootPath;
    },
    appRoot: process.env.APP_ROOT,
    windowName,
    parentWindowName,
    entryName,
};
