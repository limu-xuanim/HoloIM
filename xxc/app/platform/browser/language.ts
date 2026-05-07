import {getJSON} from '../common/network';
import {formatString} from '../../utils/string-helper';
import type {Language} from '~/app/constants';

/**
 * 获取语言表数据
 * @param langName 语言名称
 * @param pathFormat 语言文件路径格式化字符串
 * @returns 使用 Promise 异步返回语言表数据对象
 */
export const loadLangData = (langName: ValueOf<typeof Language>, pathFormat?: string): Promise<Record<string, string>> => getJSON(pathFormat ? formatString(pathFormat, langName) : `lang/${langName}.json`);

export default {
    loadLangData,
};
