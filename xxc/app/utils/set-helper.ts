/**
 * 合并多个集合取并集
 * @param firstSet 原来的集合或列表
 * @param sets 需要进行合并的集合
 * @returns 合并后的集合
 */
export function unionSets<T>(firstSet: Set<T>|Iterable<T>, ...sets: (T[]|Set<T>|Iterable<T>)[]): Set<T> {
    const setA = firstSet instanceof Set ? firstSet : new Set(firstSet);

    if (sets.length) {
        for (const setB of sets) {
            for (const item of setB) {
                setA.add(item);
            }
        }
    }

    return setA;
}

/**
 * 判断两个集合内的元素是否相同
 * @param set1 集合1
 * @param set2 集合2
 * @returns 如果为 true 则表示相同
 */
export function isSameSet(set1: Set<any>, set2: Set<any>): boolean {
    if (!set1 !== !set2 || set1.size !== set2.size) {
        return false;
    }
    for (const item of set1) {
        if (!set2.has(item)) {
            return false;
        }
    }
    return true;
}
