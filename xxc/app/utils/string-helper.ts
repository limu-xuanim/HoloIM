
// @ts-ignore 由于 eastasianwidth 没有提供类型定义，所以需要忽略
import eastasianwidth from 'eastasianwidth';
import {isEmptyString} from './check-empty';

/**
 * 时间单位表，以毫秒为基准
 */
enum TIME_UNITS {
    MS = 1,
    S = 1000,
    MIN = 60 * 1000,
    H = 60 * 60 * 1000,
    D = 24 * 60 * 60 * 1000
}

type TIME_UNIT = keyof typeof TIME_UNITS;

/**
 * 字节单位表
 */
enum BYTE_UNITS {
    B = 1,
    KB = 1024,
    MB = 1024 * 1024,
    GB = 1024 * 1024 * 1024,
    TB = 1024 * 1024 * 1024 * 1024,
}

type BYTE_UNIT = keyof typeof BYTE_UNITS;

/**
 * 格式化字符串
 * @param str 要格式化的字符串
 * @param args 格式化参数
 * @returns 格式化后的字符串
 * @example <caption>通过参数序号格式化</caption>
 *     const hello = formatString('{0} {1}!', 'Hello', 'world');
 *     // hello 值为 'Hello world!'
 */
export function formatString(str: string, ...args: (string|number|boolean)[]): string;

/**
 * 格式化字符串
 * @param str 要格式化的字符串
 * @param obj 格式化参数
 * @returns 格式化后的字符串
 * @example <caption>通过对象名称格式化</caption>
 *     const say = formatString('Say {what} to {who}', {what: 'hello', who: 'you'});
 *     // say 值为 'Say hello to you'
 */
export function formatString(str: string, obj: Record<string, string|number|boolean>): string;

export function formatString(str: string, ...args: (string|number|boolean|Record<string, string|number|boolean>)[]): string {
    if (args.length === 0) {
        return str;
    }
    if (args.length === 1 && typeof args[0] === 'object') {
        const arg = args[0];
        for (let [key, value] of Object.entries(arg)) {
            if (value === undefined) {
                continue;
            }

            if (typeof value === 'string') {
                value = value.replaceAll('$', '$$$$');
            }
            str = str.replaceAll(`{${key}}`, `${value}`);
        }

        return str;
    }

    for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        if (arg !== undefined || arg !== null) {
            if (typeof arg === 'string') {
                arg = arg.replaceAll('$', '$$$$');
            }
            str = str.replaceAll(`{${i}}`, `${arg}`);
        }
    }
    return str;
}

/**
 * 格式化字节值为包含单位的字符串
 * @param size 字节大小
 * @param fixed 保留的小数点位数
 * @param unit 单位，如果留空，则自动使用最合适的单位
 * @returns 格式化后的字符串
 */
export const formatBytes = (size: number, fixed = 2, unit: ''|BYTE_UNIT = ''): string => {
    if (typeof size !== 'number') {
        size = Number.parseInt(size, 10);
    }
    if (Number.isNaN(size)) {
        return '?KB';
    }
    if (!unit) {
        if (size < BYTE_UNITS.KB) {
            unit = 'B';
        } else if (size < BYTE_UNITS.MB) {
            unit = 'KB';
        } else if (size < BYTE_UNITS.GB) {
            unit = 'MB';
        } else if (size < BYTE_UNITS.TB) {
            unit = 'GB';
        } else {
            unit = 'TB';
        }
    }

    return (size / BYTE_UNITS[unit]).toFixed(fixed) + unit;
};

/**
 * 转换带单位的字节字符串为字节数
 * @param str 带单位的字节字符串
 * @returns 字节数
 */
export const convertBytes = (str: string): number => {
    const pattern = /^[0-9]*(B|KB|MB|GB|TB)$/;
    str = str.toUpperCase();
    const matchRes = str.match(pattern);
    if (!matchRes) {
        return 0;
    }
    const unit = matchRes[1] as BYTE_UNIT;
    str = str.replace(unit, '');
    return Number.parseInt(str, 10) * BYTE_UNITS[unit];
};

/**
 * 转换带单位的时间字符串为毫秒数
 * @param str 带单位的时间字符串
 * @returns 毫秒数
 */
export const convertTimes = (str: string): number => {
    const pattern = /^[0-9]*(MS|S|MIN|H|D)$/;
    str = str.toUpperCase();
    const matchRes = str.match(pattern);
    if (!matchRes) {
        return 0;
    }
    const unit = matchRes[1] as TIME_UNIT;
    str = str.replace(unit, '');
    return Number.parseInt(str, 10) * TIME_UNITS[unit];
};

/**
 * 检查字符串是否不是空字符串，如果为空则返回第二个参数给定的字符串，否则返回字符串自身
 * @param str 要检查的字符串
 * @param thenStr 如果为空字符串时要返回的字符串
 * @returns 如果未定义或为空字符串则返回 [thenStr]，否则返回 [str]
 */
export const ifEmptyStringThen = (str: string, thenStr: string): string => (isEmptyString(str) ? thenStr : str);

/**
 * 确保字符串长度不超过指定值，如果超出则去掉截取的部分
 * @param str 要操作的字符串
 * @param length 要限制的最大长度
 * @param suffix 如果超出显示要添加的后缀
 * @returns 返回新的字符串
 */
export const limitStringLength = (str: string, length: number, suffix?: string): string => {
    if (str.length > length) {
        str = str.substring(0, length);
        if (suffix) {
            str = `${str}${suffix}`;
        }
    }
    return str;
};

/**
 * 获取字符串展示长度
 * @param str 要获取长度的字符串
 * @returns 字符串展示长度
 */
export const getAppearanceLength = (str: string): number => eastasianwidth.length(str);

/**
 * 检查字符是否为宽字符
 * @param char 要检查的字符
 * @returns 字符是否为宽字符
 */
export const isWideCharacter = (char: string): boolean => eastasianwidth.characterLength(char) > 1;

// ascii 字符宽度值，来自 https://wiktel.com/standards/ascii.htm
const asciiWidth: Record<string, number> = {'!': 18, '"': 30, '#': 30, $: 30, '%': 36, '&': 36, '\'': 18, '(': 24, ')': 24, '*': 30, '+': 30, ',': 18, '-': 30, '.': 18, '/': 30, 0: 30, 1: 30, 2: 30, 3: 30, 4: 30, 5: 30, 6: 30, 7: 30, 8: 30, 9: 30, ':': 18, ';': 18, '<': 30, '=': 30, '>': 30, '?': 30, '@': 36, A: 36, B: 36, C: 36, D: 36, E: 36, F: 36, G: 36, H: 36, I: 24, J: 30, K: 36, L: 36, M: 42, N: 36, O: 36, P: 36, Q: 36, R: 36, S: 36, T: 36, U: 42, V: 36, W: 43, X: 36, Y: 36, Z: 30, '[': 24, '\\': 30, ']': 24, '^': 30, _: 30, '`': 18, a: 30, b: 36, c: 30, d: 36, e: 30, f: 24, g: 36, h: 36, i: 18, j: 24, k: 36, l: 18, m: 42, n: 36, o: 30, p: 36, q: 36, r: 30, s: 30, t: 24, u: 36, v: 36, w: 42, x: 30, y: 36, z: 30, '{': 24, '|': 18, '}': 24, '~': 30};

/**
 * 获取 ASCII 字符(组)宽度
 * @param char 要获取宽度的字符(组)
 * @returns 字符(组)宽度，若未定义则返回 0
 */
export const getAsciiWidth = (char: string): number => {
    if (char.length === 1) {
        return asciiWidth[char] || 0;
    }
    let hasNonAscii = false;
    const width = char.split('').reduce((prev, curr) => {
        const charWidth = asciiWidth[curr];
        if (!charWidth) {
            hasNonAscii = true;
        }
        return charWidth ? prev + charWidth : prev;
    }, 0);
    return hasNonAscii ? 0 : width;
};

/**
 * 校验手机号正则
 * @param val 要检查的数值
 * @returns 如果符合正则则返回 `true`，否则返回 `false`
 */
export const checkMobileFormat = (val: string): boolean => {
    const mobileReg = /^1\d{10}$/;
    return mobileReg.test(val);
};
/**
 * 校验邮箱正则
 * @param str 要检查的字符串
 * @returns 如果符合正则则返回 `true`，否则返回 `false`
 */
export const checkEmailFormat = (str: string): boolean => {
    const emailReg = /^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
    return emailReg.test(str);
};
/**
 * 校验电话号正则
 * @param str 要检查的字符串
 * @returns 如果符合正则则返回 `true`，否则返回 `false`
 */
export const checkPhoneFormat = (str: string): boolean => {
    const phoneReg = /^([0-9]{3,4}-?)?[0-9]{7,8}$/;
    return phoneReg.test(str);
};
/**
 * 用于匹配 @ 用户的正则表达式
 */
export const REGEXP_AT_USER = '@(#?[_.\\w\\d\\u4e00-\\u9fa5]{1,20})';

/**
 * 还原包含 @ 成员的文本消息
 * @param message @ 成员消息
 * @returns 原始文本
 */
export const restoreMessageContainAt = (message: string): string => {
    if (typeof message !== 'string' || !message.replace) {
        return message;
    }
    return message.replace(new RegExp(`\\[(?<atuser>${REGEXP_AT_USER})\\]\\(\\@\\#\\d+\\)`, 'g'), '$<atuser>');
};

/**
 * 检查 IP 地址是否合法
 * @param ip IP 地址
 * @returns 如果返回 `true` 则合法，否则为不合法
 */
export const isValidIP = (ip: string): boolean => /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig.test(ip);

/**
 * 转译正则表达式中的特殊字符
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
 * @param string 被转译的字符串
 * @returns 转译后的字符串
 */
export function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 搜索权值计算表
 */
const SEARCH_SCORE_MAP = {
    matchAll: 100,
    matchPrefix: 75,
    include: 50,
    similar: 10
};

/**
 * 计算关键词与文本的匹配度
 * @param sKey 搜索关键词
 * @param findIn 待匹配文本
 * @param searchScoreMap 搜索权值
 * @returns 匹配程度
 */
export function caculateScore(sKey: string, findIn: string, searchScoreMap = SEARCH_SCORE_MAP): number {
    if (isEmptyString(sKey) || isEmptyString(findIn)) {
        return 0;
    }
    if (sKey === findIn) {
        return searchScoreMap.matchAll;
    }
    const idx = findIn.indexOf(sKey);
    return idx === 0 ? searchScoreMap.matchPrefix : (idx > 0 ? searchScoreMap.include : 0);
}


/**
 * URL 端口号正则
 */
const URL_PORT_REGEXP = /https?:\/\/.*?:(?<port>\d{2,5})\/?/;

/**
 * 从 URL 中提取端口号
 * @param url
 * @returns 端口号，可能为空
 */
export const extractPortFromUrl = (url: string): string => {
    const arr = URL_PORT_REGEXP.exec(url);
    if (!arr) {
        return '';
    }

    return arr.groups?.port ?? '';
};


/**
 * 获取文件的扩展名
 * @param fileName 文件名
 * @returns 扩展名
 */
export const getFileExtName = (fileName: string) => {
    if (isEmptyString(fileName)) {
        return '';
    }

    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex === -1 || dotIndex === 0) {
        return '';
    }
    return fileName.substring(dotIndex + 1);
};
