import pinyin from 'tiny-pinyin';

/**
 * 将文本字符串中的中文转换为拼音形式
 * @param str 要转换的字符串
 * @param [separator=' '] 拼音分隔符
 * @returns 转换后的拼音字符串
 * @function
 * @see https://github.com/hotoo/pinyin
 */
const getPinyin = (str:string, separator = ' '): string => {
    if (typeof str === 'string' && str.length) {
        const pinyins = pinyin.parse(str);
        const targetStrings = pinyins.map(x => x.target);
        return `${targetStrings.join('')}${separator}${targetStrings.map(x => (x.length ? x[0] : '')).join('')}`.toLowerCase();
    }
    return '';
};

export default getPinyin;
