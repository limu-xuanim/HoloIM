/**
 * 合并新的项目到排序后的列表
 * @param list 初始列表
 * @param newItem 新的项目
 * @returns 返回排序后的列表
 */
export function mergeOrderedItem(list: number[], newItem: number|number[]): number[] {
    if (Array.isArray(newItem)) {
        for (const item of newItem) {
            mergeOrderedItem(list, item);
        }
        return list;
    }

    const listLength = list.length;
    if (!listLength || list[listLength - 1] < newItem) {
        list.push(newItem);
    } else if (list[0] > newItem) {
        list.unshift(newItem);
    } else {
        for (let i = 1; i < listLength; ++i) {
            if (newItem < list[i]) {
                if (newItem !== list[i - 1]) {
                    list.splice(i, 0, newItem);
                }
                break;
            }
        }
    }
    return list;
}

/**
 * 判断两个列表是否完全相同
 * @param list1 列表1
 * @param list2 列表2
 * @returns 如果返回 `true` 则为完全相同
 */
export function isDiffList(list1: any[], list2: any[]): boolean {
    if (!list1 !== !list2 || list1.length !== list2.length) {
        return true;
    }
    for (let i = list1.length - 1; i >= 0; --i) {
        if (list1[i] !== list2[i]) {
            return true;
        }
    }
    return false;
}

/**
 * 生成连续的数列
 * @param from 起始元素
 * @param to 终止元素
 * @param increment 是否递增
 * @returns 连续数列 [from, ..., to]
 */
export function generateContinuousList(from: number, to: number, increment = false): number[] {
    // 为参数取整
    from = Math.floor(from);
    to = Math.floor(to);

    if ((from > to && increment) || (from < to && !increment)) {
        throw new Error(`ILLEGAL_ARGUMENTS: from ${from} to ${to}, increment ${increment}`);
    }

    if (from === to) {
        return [from];
    }

    const len = increment ? to - from : from - to;
    const step = increment ? 1 : -1;
    const list = Array(len).fill(0).reduce((acc: number[], _, idx: number) => acc.concat(acc[idx] + step), [from]);
    if (DEBUG) {
        console.collapse('List helper', 'grayBg', 'generate list', 'grayPale', `list info: from ${from}, to ${to}, increment ${increment}`);
        console.trace('list', list);
        console.groupEnd();
    }
    return list;
}
