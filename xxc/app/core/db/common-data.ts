import dexie from './index';

/**
 * 获取通用数据项
 * @param type 类型
 * @param key 键名
 * @returns 异步返回查询结果
 * @example
 * const data = await getCommonDataItem('user', 'admin');
 */
export async function getCommonDataItem(type: string, key: string): Promise<any> {
    const table = dexie.common;
    if (!table) {
        throw new Error('Dexie database is not open, common table is null.');
    }

    const data = await table.get({type, key});
    if (!data) {
        return;
    }
    return data.value;
}

/**
 * 存储通用数据项
 * @param type 类型
 * @param key 键名
 * @param value 值
 * @returns 异步返回查询结果
 * @example
 * await putCommonDataItem('user', 'admin', {account: 'admin', email: 'user@example.com'});
 */
export function putCommonDataItem(type: string, key: string, value: any): Promise<any> {
    const table = dexie.common;
    if (!table) {
        throw new Error('Dexie database is not open, common table is null.');
    }
    return table.put({type, key, value});
}
