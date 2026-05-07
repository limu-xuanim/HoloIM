/**
 * 条件渲染 React 节点
 * @param condition 条件
 * @returns true 或 null
 */
export function renderIf(condition: any): true | null {
    return condition
        ? true
        : null;
}
