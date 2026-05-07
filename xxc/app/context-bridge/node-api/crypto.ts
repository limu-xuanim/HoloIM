import crypto from 'node:crypto';

export default {
    /**
     * 使用 AES 加密文本
     * @param data 要加密的文本字符串
     * @param token AES key
     * @param cipherIV AES token
     * @returns 返回加密后的 Buffer 数据
     */
    encrypt: (data: string, token: string, cipherIV: string): ArrayBufferLike => {
        const cipher = crypto.createCipheriv('aes-256-cbc', token, cipherIV);
        let encrypted = cipher.update(data, 'utf8', 'binary');
        encrypted += cipher.final('binary');
        return new Uint8Array(Buffer.from(encrypted, 'binary')).buffer;
    },

    /**
     * 使用 AES 解密文本
     * @param data 要解密的 Buffer 数据
     * @param token AES key
     * @param cipherIV AES token
     * @returns 返回解密后的文本
     */
    decrypt: (data: ArrayBuffer, token: string, cipherIV: string): string => {
        const decipher = crypto.createDecipheriv('aes-256-cbc', token, cipherIV);
        let decoded = decipher.update(Buffer.from(data), undefined, 'utf8');
        decoded += decipher.final('utf8');
        return decoded;
    },
};
