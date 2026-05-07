/**
 * 本地存储对象
 */
const storage = window.localStorage;

/**
 * 将 JS 值序列化为 JSON 字符串
 * @param value 要序列化的值
 * @returns 序列化后的 JSON 字符串
 */
const serialize = (value: any): string => {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
};

/**
 * 将 JSON 字符串反序列化为 JS 值
 * @param value 要反序列化的字符串
 * @returns 反序列化之后的值
 */
const deserialize = (value: string): any => {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
};

/**
 * 设置本地存储值
 * @param key 键
 * @param value 值
 */
export const setStoreItem = (key: string, value: any) => {
    storage.setItem(key, serialize(value));
};

/**
 * 获取本地存储值
 * @param key 键
 * @param defaultValue 默认值
 * @returns 存储的值
 */
export const getStoreItem = (key: string, defaultValue?: any): any => {
    const item = storage.getItem(key);
    if (!item) {
        return defaultValue;
    }

    const val = deserialize(item);
    return val ?? defaultValue;
};

/**
  * 移除本地存储值
  * @param key 键
  */
export const removeStoreItem = (key: string) => storage.removeItem(key);

/**
  * 清空本地存储
  */
export const clearStore = () => storage.clear();

/**
  * 获取本地存储条目数目
  * @returns 存储条目数目
  */
export const getStoreLength = (): number => storage.length;

/**
  * 遍历本地存储所有条目
  * @param callback 遍历回调函数
  */
export const storeForEach = (callback: (value: any, key: string, index: number) => void) => {
    const length = getStoreLength();
    for (let i = 0; i < length; ++i) {
        const key = storage.key(i)!;
        callback?.(getStoreItem(key), key, i);
    }
};

/**
  * 通过对象返回本地存储中的所有键值对
  * @returns 键值对对象
  */
export const storeGetAll = (): Record<string, any> => {
    const all: Record<string, any> = {};
    storeForEach((value: any, key: string) => {
        all[key] = value;
    });
    return all;
};

export default Object.freeze({
    set: setStoreItem,
    get: getStoreItem,
    remove: removeStoreItem,
    clear: clearStore,
    forEach: storeForEach,
    get length() {
        return getStoreLength();
    },
    get all() {
        return storeGetAll();
    }
});
