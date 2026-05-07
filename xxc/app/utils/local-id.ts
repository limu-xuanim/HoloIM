/**
 * 本地 ID 最小值
 */
const LOCAL_ID_MIN = Math.floor(Number.MAX_SAFE_INTEGER / 2);

/**
  * 本地 ID 自增计数器
  */
let localIDSeed = Math.floor(LOCAL_ID_MIN + Date.now() / 2) + 1;

/**
 * 判定 ID 是否为本地生成的
 * @param id 消息 ID
 * @returns 如果返回 `true` 则为是，否则为不是
 */
export function isLocalID(id: number): boolean {
    return id >= LOCAL_ID_MIN;
}

/**
 * 生成新的本地 ID
 * @returns 本地 ID
 */
export function createLocalID(): number {
    return localIDSeed++;
}
