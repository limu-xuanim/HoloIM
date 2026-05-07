import {memo, ReactNode} from 'react';
import {classes} from '../utils/html-helper';
import type {MediaStatus, MediaType} from '../views/chats/message-content-media';
import MediaView from './media-view';

type MediaHolderProps = Partial<{
    id: string;
    source: string|Array<{type: string; src: string;}>;
    sourceType: string;
    width: number;
    height: number;
    thumbnailWidth: number;
    thumbnailHeight: number;
    mediaType: MediaType;
    status: MediaStatus;
    maxWidth: number;
    maxHeight: number;
    controls: boolean;
    thumbnail: string;
    hint: string;
    progress: number;
    loadingText: string;
    brokenMessage: string;
    onRequestReload: () => void;
    className: string;
    style: React.CSSProperties;
    children: ReactNode;
}>;

type SizeInfo = {
    maxHeight: number;
    maxWidth: number;
};

/**
 * 媒体文件显示组件，通过指定媒体宽度和高度可以避免媒体文件加载完成后出现抖动情况
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @param props.source 媒体文件路径
 * @param props.sourceType 媒体文件类型
 * @param props.width 媒体原始宽度
 * @param props.height 媒体原始高度
 * @param props.thumbnailWidth 媒体缩略图宽度
 * @param props.thumbnailHeight 媒体缩略图高度
 * @param props.mediaType 媒体类型
 * @param props.status 媒体文件状态
 * @param props.maxWidth 媒体最大显示宽度
 * @param props.maxHeight 媒体最大显示高度
 * @param props.controls 是否为视频或音频媒体显示控制界面
 * @param props.thumbnail 缩略图文件路径
 * @param props.hint 提示文本
 * @param props.progress 媒体文件状态为加载中时（`status` 为 `loading`）的加载进度
 * @param props.loadingText 媒体文件状态为加载中时（`status` 为 `loading`）的提示文本
 * @param props.brokenMessage 媒体文件状态为加载失败时（`status` 为 `broken`）的提示文本
 * @param props.onRequestReload 当请求重新加载时的回调函数（仅在加载失败时可能被调用）
 * @param props.className 组件元素类名
 * @param props.style 组件元素样式
 * @param props.children 子内容
 * @returns React Node content
 */
function MediaHolder(props: MediaHolderProps) {
    const {
        source,
        sourceType,
        width,
        height,
        thumbnailWidth,
        thumbnailHeight,
        mediaType = 'image',
        status = 'ok',
        maxWidth = 2000,
        maxHeight = 360,
        controls = true,
        thumbnail,
        hint,
        progress = 0,
        loadingText,
        brokenMessage,
        onRequestReload,
        className,
        style,
        children,
        ...others
    } = props;

    const hasGivenSize = !!(width && height);
    const hasGivenThumbnailSize = !!(thumbnailWidth && thumbnailHeight);
    const maxSize: SizeInfo = {maxHeight, maxWidth};
    if (hasGivenSize && !hasGivenThumbnailSize) {
        // 如果宽度和高度均未超出，则使用实际宽高
        if (height <= maxSize.maxHeight && width <= maxSize.maxWidth) {
            maxSize.maxHeight = height;
            maxSize.maxWidth = width;
        } else {
            let actualHeight = height;
            let actualWidth = width;
            // 如果高度超出，则减少高度
            if (height > maxSize.maxHeight) {
                actualHeight = maxSize.maxHeight as number;
                // 减少高度后，等比例计算宽度
                actualWidth = Math.floor((actualHeight * width) / height);
                maxSize.maxWidth = actualWidth;
            }
            // 如果上面调整高度后宽度仍然超出，则减少宽度
            if (actualWidth > maxSize.maxWidth) {
                actualHeight = Math.floor(((maxSize.maxWidth as number) * actualHeight) / actualWidth);
                maxSize.maxHeight = actualHeight;
            }
        }
    }

    const rootStyle = {
        ...maxSize,
        ...style,
        height: '100%'
    };

    let aspectratioView = null;
    if (hasGivenSize) {
        const aspectratioStyle = {
            paddingBottom: hasGivenSize
                ? ((height > maxHeight && width / height < (maxHeight / maxWidth))
                    ? maxHeight
                    : (width
                        ? `${(100 * height) / width}%`
                        : 0))
                : 0,
        };
        aspectratioView = <div className="media-holder-aspectratio" style={aspectratioStyle} />;
    }

    return (
        <div
            className={classes(
                className,
                `media-holder media-holder-status-${status} media-holder-media-${mediaType}`,
                {
                    'has-given-size': !!hasGivenSize,
                    'not-given-size': !hasGivenSize
                }
            )}
            style={rootStyle}
            {...others}
        >
            <MediaView
                status={status}
                mediaType={mediaType}
                className={className}
                onRequestReload={onRequestReload}
                brokenMessage={brokenMessage}
                source={source}
                thumbnail={thumbnail}
                sourceType={sourceType}
                progress={progress}
                loadingText={loadingText}
                hint={hint}
                controls={controls}
                maxWidth={rootStyle.maxWidth as number}
            />
            {aspectratioView}
            {children}
        </div>
    );
}

export default memo(MediaHolder);
