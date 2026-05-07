import {memo} from 'react';
import ErrorBoundary from '~/app/components/error-boundary';
import FileData from '~/app/core/files/file-data';
import MediaPreview from '~/app/components/media-preview';
import WindowControllsBar from '~/app/components/window-controls-bar';
import {getWindowStateController, setWindowTitle} from '~/app/platform/electron/window-controller';
import {saveAsImageFromUrl} from '~/app/platform/electron/dialog';
import {writeBmpTiffImageFromFile, writeImageFromUrl} from '~/app/platform/electron/clipboard';
import {displayContextMenu} from '~/app/core/context-menu';
import {blobToDataURI} from '~/app/core/files/files-helper';

// 获取远程共享的数据
const {Lang, ChatMessagesStoreModule} = window.galleryAPI;
const {default: chatMessagesStore} = ChatMessagesStoreModule;

/**
 * 处理媒体文件显示事件
 * @param mediaInfo 媒体文件信息
 */
function handleMediaShow(mediaInfo: {title: string}) {
    const title = mediaInfo?.title
        ? `${Lang.string('media.preview')} - ${mediaInfo.title}`
        : Lang.string('media.preview');
    setWindowTitle(title);
}

/**
 * 处理媒体文件另存为事件
 * @param url 媒体文件url
 */
function handleMediaSaveAs(url: string) {
    const isFileUrl = url.startsWith('file://');
    const cleanUrl = isFileUrl ? url.split('?')[0] : url;
    saveAsImageFromUrl(cleanUrl);
}

/**
 * 处理媒体文件复制事件
 * @param url 媒体文件url
 */
async function handleMediaCopy(url: string, sizeInfo: {width: number; height: number}) {
    const isBase64Image = url.startsWith('data:image/');
    if (isBase64Image) {
        writeImageFromUrl(url, 'base64');
        return;
    }

    const res = await fetch(url);
    const imgFile = await res.blob();
    if (['image/gif', 'image/bmp', 'image/tiff', 'image/svg'].includes(imgFile.type)) {
        const {width, height} = sizeInfo;
        const file = FileData.fromBlob(imgFile, {width, height});
        writeBmpTiffImageFromFile(file);
        return;
    }

    // 某些 https 图片返回的 Blob.type 为空，FileReader 生成的 dataURL 不是 image/*，会导致 Electron 无法识别
    // 这里通过 canvas 强制转成 PNG，保证得到合法的 image/png DataURL
    let dataUrl: string;
    if (!imgFile.type || !imgFile.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(imgFile);
        try {
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = objectUrl;
            });
            const canvas = document.createElement('canvas');
            canvas.width = image.width || sizeInfo.width;
            canvas.height = image.height || sizeInfo.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return;
            }
            ctx.drawImage(image, 0, 0);
            dataUrl = canvas.toDataURL('image/png');
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    } else {
        dataUrl = await blobToDataURI(imgFile);
    }

    writeImageFromUrl(dataUrl, 'base64');
}

/**
 * 处理媒体文件右键事件
 * 这里没有使用contextMenuCreator，在打开showMediaPreviewWindow时倒是能够拿到媒体文件，但是最终要传给gallery需要通过window.open方法，将对象序列化并且长度还不能超过get参数长度。暂时简单做了。
 * @param position 右键位置信息
 * @param url 媒体文件url
 */
function handleMediaContextMenu(
    position: {x: number; y: number},
    url: string,
    sizeInfo: {width: number; height: number},
) {
    displayContextMenu(position, [
        {
            label: Lang.string('menu.image.copy'),
            click: () => handleMediaCopy(url, sizeInfo),
        },
        {
            label: Lang.string('menu.image.saveAs'),
            click: () => handleMediaSaveAs(url),
        },
    ]);
}

/**
 * 媒体预览窗口界面
 * @returns JSX.Element
 */
function GalleryApp() {
    const {obtainer, user} = window.galleryAPI;
    return (
        <div className="app-gallery">
            <WindowControllsBar controller={getWindowStateController()} />
            <ErrorBoundary>
                {obtainer && (
                    <MediaPreview
                        className="dock"
                        obtainer={obtainer}
                        prevText={Lang.string('media.prev')}
                        nextText={Lang.string('media.next')}
                        obtainText={Lang.string('common.rerequest')}
                        zoomInText={Lang.string('media.zoomIn')}
                        zoomOutText={Lang.string('media.zoomOut')}
                        zoomResetText={Lang.string('media.zoomReset')}
                        rotate90Text={Lang.string('media.rotate90')}
                        saveAsText={Lang.string('menu.image.saveAs')}
                        title={Lang.string('media.preview')}
                        retracted={Lang.string('file.retracted')}
                        onShow={handleMediaShow}
                        onContextMenu={handleMediaContextMenu}
                        handleMediaSaveAs={handleMediaSaveAs}
                        user={user}
                        showActions
                        getMessage={(id) => chatMessagesStore.getMessage(id)}
                    />
                )}
            </ErrorBoundary>
        </div>
    );
}

export default memo(GalleryApp);
