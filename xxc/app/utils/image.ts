/**
 * 图片尺寸信息
 */
type ImageSize = {
    width: number;
    height: number;
};

/**
 * 获取图片尺寸信息
 * @param src 图片地址
 * @returns 异步返回图片尺寸
 */
export function getImageSize(src: string): Promise<ImageSize> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const {width, height} = img;
            resolve({width, height});
        };
        img.onerror = (event) => {
            console.error(`Cannot load image from "${src}".`);
            reject(event);
        };
        img.src = src;
    });
}

/**
 * 根据图片尺寸获取缩略图尺寸
 * @param originSize 图片实际尺寸信息
 * @param limitSize 缩略图最大尺寸信息
 * @returns  缩略图尺寸信息
 */
export function getThumbnailSize(originSize: ImageSize, limitSize: ImageSize): ImageSize {
    const {width: actualWidth, height: actualHeight} = originSize;
    const {width: maxWidth, height: maxHeight} = limitSize;
    let width = actualWidth;
    let height = actualHeight;

    // 限制宽高不超过给定的最大尺寸
    if (maxWidth && width > maxWidth) {
        height = Math.floor((maxWidth * height) / width);
        width = maxWidth;
    }
    if (maxHeight && height > maxHeight) {
        width = Math.floor((maxHeight * width) / height);
        height = maxHeight;
    }
    return {width, height};
}
