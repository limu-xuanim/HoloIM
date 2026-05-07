/**
 * 将指定的图片复制到剪切板
 * @param url 图片地址
 * @param dataType 数据类型
 */
export const writeImageFromUrl = (url: string, dataType: 'path'|'base64' = 'path') => {
    if (url.startsWith('http://') || url.startsWith('https://')) { // 处理头像复制。成员资料组件中使用了viewMedia命令来加载点击事件，不好处理，所以在这里处理
        const avatarImg = document.getElementsByTagName('img')?.[0];
        if (!avatarImg) {
            return;
        }

        const convas = document.createElement('canvas');
        convas.width = avatarImg.width;
        convas.height = avatarImg.height;
        const context2D = convas.getContext('2d');
        if (!context2D) {
            return;
        }

        context2D.drawImage(avatarImg, 0, 0);
        const dataUrl = convas.toDataURL('image/png');
        window.electronAPI.clipboardWriteImageFromDataURL(dataUrl);
        return;
    }

    if (url.startsWith('file://')) {
        url = url.substring(7);
    }
    if (dataType === 'base64') {
        window.electronAPI.clipboardWriteImageFromDataURL(url);
    } else {
        window.electronAPI.clipboardWriteImageFromPath(url);
    }
};

/**
 * 将bmp或者tiff图片复制到剪切板
 * @param file 图片文件
 */
export const writeBmpTiffImageFromFile = (file: FileData) => {
    const {cachePath, viewUrl, mediaWidth, mediaHeight} = file;
    const filePath = cachePath || viewUrl;
    const oldImg = new Image();
    const convas = document.createElement('canvas');
    convas.width = mediaWidth;
    convas.height = mediaHeight;
    oldImg.src = filePath;
    oldImg.onload = () => {
        const context2D = convas.getContext('2d')
        if (!context2D) {
            return
        }
        context2D.drawImage(oldImg, 0, 0);
        const url = convas.toDataURL('image/png');
        window.electronAPI.clipboardWriteImageFromDataURL(url);
    };
};

/**
 * 获取 NativeImage 图片信息
 * @param nativeImg NativeImage 图片对象
 * @returns 图片信息对象
 */
const getImageData = (nativeImg: Electron.NativeImage) => {
    if (nativeImg && !nativeImg.isEmpty()) {
        const size = nativeImg.getSize();
        const base64 = nativeImg.toDataURL();
        const base64Length = base64.length;
        return {
            name: `clipboard-image-${size.width}x${size.height}.png`,
            type: 'image/png',
            base64,
            width: size.width,
            height: size.height,
            size: Math.ceil((4 * base64Length) / 3) + (base64Length % 3 !== 0 ? 4 : 0)
        };
    }
    return null;
};

/**
 * 上次剪切板中的图片信息
 */
let lastNewImage = getImageData(window.electronAPI.clipboardReadImage());

/**
 * 获取剪切板中的新的图片信息
 * @returns 图片信息对象
 */
export const getNewImage = () => {
    const currentImage = getImageData(window.electronAPI.clipboardReadImage());
    if (!lastNewImage || !currentImage || currentImage.base64 !== lastNewImage.base64) {
        lastNewImage = currentImage;
        return currentImage;
    }
    return null;
};

/**
 * 获取剪切板中的文本内容
 * @param type 内容类型
 * @returns 剪贴板中的纯文本内容。
 */
export const readText = window.electronAPI.clipboardReadText;

/**
 * 将文本内容写入剪切板中
 * @param text 文本内容
 * @param type 内容类型
 */
export const writeText = window.electronAPI.clipboardWriteText;

/**
 * 获取剪切板中的图片内容
 * @param type 内容类型
 * @returns 返回剪贴板中的图像内容
 */
export const readImage = window.electronAPI.clipboardReadImage;

/**
 * 获取剪切板中的HTML内容
 * @param type 内容类型
 * @returns 返回剪贴板中的HTML内容
 */
export const readHTML = window.electronAPI.clipboardReadHTML;

/**
 * 将HTML内容写入剪切板中
 * @param markup HTML内容
 * @param type 内容类型
 */
export const writeHTML = window.electronAPI.clipboardWriteHTML;

/**
 * 将内容写入剪切板中
 * @param data 内容
 * @param type 内容类型
 */
export const write = window.electronAPI.clipboardWrite;

const clipboardModule = {
    readText,
    writeText,
    readImage,
    readHTML,
    writeHTML,
    write,
    writeImageFromUrl,
    getNewImage,
    writeBmpTiffImageFromFile
};

export default clipboardModule;
export type ElectronClipboard = typeof clipboardModule;
