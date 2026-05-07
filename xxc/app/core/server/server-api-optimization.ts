import JSONOptimizer from '../../utils/json-optimizer';
import SocketMessage from './socket-message';

/**
 * 当前用户的 API 数据优化工具实例
 */
let jsonOptimizer: JSONOptimizer;

/**
 * 获取当前用户 API 数据优化工具实例
 * @param user 当前用户
 * @returns 返回 API 数据优化工具实例
 */
export const getJSONOptimizer = (user: User): JSONOptimizer => {
    if (!jsonOptimizer || jsonOptimizer.version !== user.apiVersion || jsonOptimizer.identify !== user.identify) {
        jsonOptimizer = new JSONOptimizer(user.apiScheme);
        jsonOptimizer.identify = user.identify;
    }
    return jsonOptimizer;
};

/**
 * 对 API 返回的压缩后的 JSON 字符串进行还原操作并返回原始对象
 * @param user 当前用户
 * @param json JSON 字符串
 * @returns 返回还原后的数据
 */
export const decodeJSON = (user: User, json: string): any => getJSONOptimizer(user).decodeFromJSON(json);

/**
 * 对将要发送给 API 的数据进行压缩并返回 JSON 字符串
 * @param user 当前用户
 * @param schemeTypeName 数据类型名称
 * @param data 原始数据
 * @returns 返回 JSON 字符串
 */
export const encodeJSON = (user: User, schemeTypeName: string, data: any): string => getJSONOptimizer(user).encodeToJSON(schemeTypeName, data, 'requestPack');

/**
 * 对 API 返回的压缩后数据进行还原操作并返回原始对象
 * @param user 当前用户
 * @param encodedData 压缩后的数据
 * @returns 返回还原后的数据
 */
export const decodeData = (user: User, encodedData: any): any => getJSONOptimizer(user).decode(encodedData, null, 'responsePack');

/**
 * 对将要发送给 API 的数据进行压缩并返回压缩后的数据
 * @param user 当前用户
 * @param schemeTypeName 数据类型名称
 * @param data 原始数据
 * @returns 返回压缩后的数据
 */
export const encodeData = (user: User, schemeTypeName: string, data: any): any => getJSONOptimizer(user).encode(schemeTypeName, data, 'requestPack');

/**
 * 将一个 SocketMessage 实例转换为 JSON 并进行压缩操作
 * @param user 当前用户
 * @param socketMessage SocketMessage 实例
 * @param perfData 性能记录数据
 * @returns JSON 字符串
 */
export const encodeSocketMessage = (user: User, socketMessage: SocketMessage, perfData: {sendSize: number;receiveSize: number; decodedSize: number; encodedSize: number;}): string => {
    let json: string;
    try {
        json = encodeJSON(user, socketMessage.requestSchemeName, socketMessage.requestData);
    } catch (error) {
        if (DEBUG_E) {
            console.collapse('Encode ERROR', 'redBg', error.message, 'redPale');
            console.error(error);
            console.log('scheme', error.scheme);
            console.log('optimizer', error.optimizer);
            console.log('originalData', JSON.stringify(error.originalData));
            console.log('encodeData', JSON.stringify(error.encodeData));
            console.log('socketMessage', socketMessage);
            console.groupEnd();
        }
        throw error;
    }
    if (DEBUG_V && perfData) {
        const sendSize = socketMessage.json.length;
        const encodedSize = json.length;
        perfData.encodedSize += encodedSize;
        perfData.sendSize += sendSize;
        const totalEncodedSize = perfData.encodedSize + perfData.receiveSize;
        const totalSize = perfData.sendSize + perfData.decodedSize;
        console.collapse(
            'Encoded',
            'indigoBg',
            socketMessage.requestSchemeName,
            'indigoPale',
            `${sendSize} → ${encodedSize}`,
            'bold',
            `${((100 * encodedSize) / sendSize).toFixed(1)}%%`,
            sendSize > encodedSize ? 'green' : sendSize === encodedSize ? 'muted' : 'red',
            `average ${((100 * perfData.encodedSize) / perfData.sendSize).toFixed(1)}%%`,
            perfData.sendSize > perfData.encodedSize ? 'green' : perfData.sendSize === perfData.encodedSize ? 'muted' : 'red',
            `total ${((100 * totalEncodedSize) / totalSize).toFixed(1)}%%`,
            totalSize > totalEncodedSize ? 'green' : totalSize === totalEncodedSize ? 'muted' : 'red'
        );
        console.log('original', socketMessage.requestData);
        console.log('encoded', json);
        console.groupEnd();
    }

    // 版本兼容的情况下，在登录请求 JSON 数组前追加 serverName，使得 xxd 能够识别用户要登录的 server
    if (socketMessage.requestSchemeName === 'userloginRequest') {
        return user.serverName + json;
    }
    return json;
};

/**
 * 从 JSON 字符串创建 SocketMessage 类实例，如果 JSON 内容是一个数组，则返回一个 SocketMessage 实例数组
 * @param user 当前用户
 * @param json JSON 字符串或 JSON 对象
 * @param perfData 性能记录数据
 * @returns SocketMessage 类实例或 SocketMessage 实例数组
 */
export const decodeSocketMessage = (user: User, json: string, perfData: {sendSize: number; encodedSize: number;receiveSize: number; decodedSize: number;}) => {
    const jsonData = typeof json === 'string' ? JSON.parse(json) : json;
    let data;
    if (user && user.hasApiScheme && Array.isArray(jsonData)) {
        try {
            data = decodeData(user, jsonData);
        } catch (error) {
            if (DEBUG_E) {
                console.collapse('Decoded ERROR', 'redBg', error.message, 'redPale');
                console.error(error);
                console.log('jsonData', jsonData);
                console.log('scheme', error.scheme);
                console.log('optimizer', error.optimizer);
                console.log('encodedData', JSON.stringify(error.encodedData));
                console.log('originalData', JSON.stringify(error.originalData));
                console.groupEnd();
            }
            return null;
        }
    } else {
        data = jsonData;
    }
    if (DEBUG_V && perfData && user && user.hasApiScheme) {
        const receiveSize = json ? JSON.stringify(jsonData).length : 0;
        const decodedSize = data ? JSON.stringify(data).length : 0;
        perfData.decodedSize += decodedSize;
        perfData.receiveSize += receiveSize;
        const totalCompressedSize = perfData.encodedSize + perfData.receiveSize;
        const totalSize = perfData.sendSize + perfData.decodedSize;
        console.collapse(
            'Decoded',
            'indigoBg',
            `${data.module ? `${data.module}/` : ''}${data.method}Response`,
            'indigoPale',
            `${receiveSize} → ${decodedSize}`,
            'bold',
            `${((100 * receiveSize) / decodedSize).toFixed(1)}%%`,
            decodedSize > receiveSize ? 'green' : decodedSize === receiveSize ? 'muted' : 'red',
            `average ${((100 * perfData.receiveSize) / perfData.decodedSize).toFixed(1)}%%`,
            perfData.decodedSize > perfData.receiveSize ? 'green' : perfData.receiveSize === perfData.decodedSize ? 'muted' : 'red',
            `total ${((100 * totalCompressedSize) / totalSize).toFixed(1)}%%`,
            totalSize > totalCompressedSize ? 'green' : totalSize === totalCompressedSize ? 'muted' : 'red'
        );
        console.log('original', data);
        console.log('encoded', json);
        console.groupEnd();
    }
    return new SocketMessage(data);
};
