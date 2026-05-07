/**
 * 全局唯一 ID 种子
 */
let lastUidAmend = 0;

/**
 * 快速生成基于时间递增的数值
 * @returns 数值
 */
export function timeSequence(): number {
    return (Date.now() - 1595904404862) * 10e2 + ((lastUidAmend++) % 10e2);
}
/**
 * 快速生成全局唯一 ID（此实现为简单实现，仅能保证当前用户应用启动期间唯一）
 * @returns 字符串形式的全局唯一 ID
 */
export function fuidAsNumber(): number {
    return (Date.now() - 1595904404862) * 10e7 + Math.floor(Math.random() * 10e4) * 10e2 + ((lastUidAmend++) % 10e2);
}

/**
 * 快速生成全局唯一 ID（此实现为简单实现，仅能保证当前用户应用启动期间唯一）
 * @returns 字符串形式的全局唯一 ID
 */
export default function fuid(): string {
    return fuidAsNumber().toString(36);
}
