import {v4 as uuidv4} from 'uuid';
import {setStoreItem, getStoreItem} from '../../utils/store';

/**
 * 存储当前设备 ID
 */
let deviceID: string;

/**
 * 获取设备 ID
 * @returns 设备 ID 字符串
 */
export const getDeviceID = (): string => {
    if (!deviceID) {
        const storeKey = 'DEVICE_ID';
        deviceID = getStoreItem(storeKey);
        if (!deviceID) {
            deviceID = uuidv4();
            setStoreItem(storeKey, deviceID);
        }
    }
    return deviceID;
};
