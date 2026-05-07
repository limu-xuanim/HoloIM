/**
 * 将 data uri 数据转换为 Blob 对象
 * @param dataURI data uri 格式数据
 * @returns Blob 对象
 */
export function dataURItoBlob(dataURI: string): Blob {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs
    const byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    const bb = new Blob([ab], {type: mimeString});
    return bb;
}

/**
 * 将 Blob 对象转换为 data URI 数据
 * @param blob Blob
 * @returns data URI 字符串
 */
export function blobToDataURI(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(<string>reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * 将本地文件路径转换为 URL
 * @param localPath 本地文件路径
 * @returns URL
 */
export function convertLocalPathToUrl(localPath: string): string {
    if (localPath.startsWith('file://')) {
        return localPath;
    }
    return `file://${localPath}?t=${Date.now()}`;
}
