import {v4 as uuidv4} from 'uuid';
import env from './env';

/**
 * 创建用户个人目录
 * @param identify 用户对象
 * @param fileName 文件名称
 * @param dirName=images 目录名称
 * @returns 用户个人目录
 */
export const createUserDataPath = (identify: string, fileName: string, dirName = 'images'): string => window.nodeAPI.pathJoin(env.dataPath, 'users', identify, dirName, fileName);

/**
 * 创建临时文件
 * @param ext 文件扩展名
 * @returns 临时文件保存路径
 */
export const makeTmpFilePath = (ext = ''): string => window.nodeAPI.pathJoin(env.dataPath, `tmp/${uuidv4()}${ext}`);

/**
 * 打开屏幕录制权限设置
 */
export function openMacScreenCapturePreferences() {
    if (env.isOSX) {
        window.electronAPI.shellOpenExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }
}

/**
 * 以秒为单位返回系统启动时间。
 * @returns 系统启动后过了多少秒
 */
export const uptime = (): number => window.nodeAPI.osUptime();

export default {
    makeTmpFilePath,
    createUserDataPath,
    openMacScreenCapturePreferences,
    uptime,
};
