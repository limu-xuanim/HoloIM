import {setStoreItem, getStoreItem} from '../utils/store';

const storeKey = 'LOCAL_SETTINGS';

/**
 * 获取指定设置
 * @param key 要获取的设置 key
 * @returns 设置内容
 */
export const getLocalConfig = (key: string) => getStoreItem(storeKey, {})[key] || undefined;

/**
 * 获取全部设置
 * @returns 全部设置内容
 */
export const getAllLocalConfig = () => getStoreItem(storeKey, {});

/**
 * 保存设置到本地存储
 * @param config 设置内容
 */
const saveLocalConfig = (config: any) => {
    setStoreItem(storeKey, config);
};

/**
 * 变更设置
 * @param obj 要变更的设置 对象
 */
export function setLocalConfig(obj: object): void;

export function setLocalConfig(key: string, value: any): void;

/**
 * 变更设置
 * @param key 要变更的设置 key
 * @param value 要变更的设置 value
 */
export function setLocalConfig(key: string|object, value?: any) {
    const config = getAllLocalConfig();
    if (typeof key === 'object') {
        Object.assign(config, key);
    } else {
        config[key] = value;
    }
    saveLocalConfig(config);
}

/**
 * 删除指定设置
 * @param key 要删除的设置 key
 */
export const removeLocalConfig = (key: string) => {
    const config = getAllLocalConfig();
    if (Object.keys(config).includes(key)) {
        delete config[key];
        saveLocalConfig(config);
    }
};
