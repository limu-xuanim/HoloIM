import fs from './fs';
import env from './env';
import {formatString} from '../../utils/string-helper';
import {EVENT_APP_LANG_CHANGE} from './remote-events';
import type {Language} from '~/app/constants';

/**
 * 主进程中使用到的语言项键名（可以为前缀）
 */
const langKeysUsedInMainProcess = Object.freeze(['app.', 'common.', 'menu.', 'debug.'] as const);

/**
 * 获取语言表数据
 * @param langName 语言名称
 * @param pathFormat 语言文件路径格式化字符串
 * @returns 语言表数据对象
 */
export const loadLangData = (langName: ValueOf<typeof Language>, pathFormat?: string): Promise<Record<string, string>> => {
    const langFilePath = pathFormat
        ? formatString(pathFormat, langName)
        : window.nodeAPI.pathJoin(process.env.HOT ? env.appRoot : env.appPath, 'lang', `${langName}.json`);
    return fs.readJSON(langFilePath, {throws: false});
};

/**
 * 处理语言变更事件
 * @param langName 当前语言名称
 * @param langData 当前语言数据
 */
export const handleLangChange = (langName: ValueOf<typeof Language>, langData: Record<string, string>) => {
    // 过滤主进程中没有用到的语言项
    const remoteLangData = Object.keys(langData).reduce((data, key) => {
        if (langKeysUsedInMainProcess.some(x => key.startsWith(x))) {
            data[key] = langData[key];
        }
        return data;
    }, <Record<string, string>>{});
    window.xuanAPI.changeLang(env.windowName, langName, remoteLangData);
};

/**
 * 语言变更处理函数
 */
let requestChangeLangHandler: (language: ValueOf<typeof Language>) => void;

/**
 * 设置请求变更语言处理函数
 * @param handler 处理函数
 */
export const setRequestChangeLangHandler = (handler: typeof requestChangeLangHandler) => {
    requestChangeLangHandler = handler;
};

/**
 * 初始化语言访问功能
 */
export const initLanguage = () => {
    // 处理其他窗口请求变更语言事件
    window.electronAPI.ipcRenderer.on[EVENT_APP_LANG_CHANGE]((_e, langName) => {
        if (requestChangeLangHandler) {
            requestChangeLangHandler(langName);
        }
    });
};

export default {
    loadLangData,
    handleLangChange,
    setRequestChangeLangHandler,
};
