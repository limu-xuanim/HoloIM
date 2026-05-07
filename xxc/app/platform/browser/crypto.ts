import AES from 'aes-js';

/**
 * 使用 AES 加密文本
 * @param data 要加密的文本字符串
 * @param token AES key
 * @param cipherIV AES token
 * @returns 返回加密后的 Buffer 数据
 */
const encrypt = (data: string, token: string, cipherIV: string): ArrayBufferLike => {
    const key = AES.utils.utf8.toBytes(token);
    const iv = AES.utils.utf8.toBytes(cipherIV);
    const aesCbc = new AES.ModeOfOperation.cbc(key, iv);
    const dataBytes = AES.utils.utf8.toBytes(data);
    const paddedData = AES.padding.pkcs7.pad(dataBytes);
    const encryptedBytes = aesCbc.encrypt(paddedData);
    return encryptedBytes.buffer;
};

/**
 * 使用 AES 解密文本
 * @param data 要解密的 Buffer 数据
 * @param token AES key
 * @param cipherIV AES token
 * @returns 返回解密后的文本
 */
const decrypt = (data: ArrayBuffer, token: string, cipherIV: string): string => {
    const key = AES.utils.utf8.toBytes(token);
    const iv = AES.utils.utf8.toBytes(cipherIV);
    const aesCbc = new AES.ModeOfOperation.cbc(key, iv);
    const utf8Array = new Uint8Array(data);
    const decryptedBytes = aesCbc.decrypt(utf8Array);
    const decryptedText = AES.utils.utf8.fromBytes(AES.padding.pkcs7.strip(decryptedBytes));
    return decryptedText;
};

export default {
    encrypt,
    decrypt,
};
