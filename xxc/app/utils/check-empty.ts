/**
 * 判断给定的值是否为非空数组，当值为数组且不为空时返回 true
 * @param value 待判断值
 * @returns 判断结果
 */
export const isNotEmptyArray = (value: any): value is Array<any> => {
    if (!Array.isArray(value)) {
        return false;
    }

    return value.length > 0;
}

/**
 * 判断给定的值是否为 null 或 undefined
 * @param value 待判断的值
 * @returns 结果
 */
export const isNullish = (value: any): value is Nullish => (value === null || value === undefined);

/**
 * 检查字符串是否为未定义（`null` 或者 `undefined`）或者为空字符串
 * @param value 要检查的字符串
 * @returns 如果未定义或为空字符串则返回 `true`，否则返回 `false`
 */
export const isEmptyString = (value: any): value is (Nullish | '') => (isNullish(value) || value === '');

/**
 * 检查字符串是否不是空字符串
 * @param value 要检查的字符串
 * @returns 如果为非空字符串则返回 `true`，否则返回 `false`
 */
export const isNotEmptyString = (value: any): value is string => (typeof value === 'string' && value !== '');
