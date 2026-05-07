/**
 * File 对象转 base64
 * @param file 文件
 * @returns 转换结果
 */
export function fileToBase64(file: File): Promise<{base64: string; name: string;}> {
    return new Promise((resolve, reject) => {
        const {name} = file;
        const fileReader = new FileReader();
        fileReader.onload = () => {
            const base64 = fileReader.result as string;
            resolve({base64, name});
        };
        fileReader.onerror = (error) => {
            reject(error);
        };
        fileReader.readAsDataURL(file);
    });
}

/**
 * 将 base64 内容转换为 File 对象
 * @param base64 base64 内容
 * @param filename 文件名
 * @returns File 对象
 */
export async function base64ToFile(base64: string, filename?: string) {
    const response = await fetch(base64);
    const blob = await response.blob();
    const {type, size} = blob;
    const name = filename ? filename : `${Date.now()}${size}.${type.split('/')?.[1]}`;
    return new File([blob], name, {type});
}

/**
 * 读取 blob 的文本内容
 * @param blob blob
 * @param encoding 编码
 * @returns 文本内容
 */
export const readBlobAsText = (blob: Blob, encoding: string) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
        resolve(fr.result);
    };

    fr.onerror = err => {
        reject(err);
    };

    fr.readAsText(blob, encoding);
});
