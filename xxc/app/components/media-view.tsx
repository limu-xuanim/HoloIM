import {classes} from '../utils/html-helper';
import Icon from './icon';
import {showMessager} from './messager';

import type {MediaStatus, MediaType} from '../views/chats/message-content-media';
import useLang from '../views/common/use-lang';

/**
 * 处理媒体文件加载失败事件
 * @param e 事件对象
 */
function handleMediaBroken(e: React.SyntheticEvent<HTMLImageElement, Event>) {
    (e.target as HTMLImageElement).classList.add('broken');
}

type MediaViewProps = {
    status: MediaStatus;
    mediaType: MediaType;
    className: string;
    onRequestReload?: () => void;
    brokenMessage: string;
    source: string|Array<{type: string; src: string;}>;
    thumbnail: string;
    sourceType: string;
    progress: number;
    loadingText: string;
    hint: string;
    controls: boolean;
    maxWidth: number;
};

/**
 * 媒体视图
 * @param props React 组件属性对象
 * @param props.source 媒体文件路径
 * @param props.sourceType 媒体文件类型
 * @param props.mediaType 媒体类型
 * @param props.status 媒体文件状态
 * @param props.controls 是否为视频或音频媒体显示控制界面
 * @param props.thumbnail 缩略图文件路径
 * @param props.hint 提示文本
 * @param props.progress 媒体文件状态为加载中时（`status` 为 `loading`）的加载进度
 * @param props.loadingText 媒体文件状态为加载中时（`status` 为 `loading`）的提示文本
 * @param props.brokenMessage 媒体文件状态为加载失败时（`status` 为 `broken`）的提示文本
 * @param props.onRequestReload 当请求重新加载时的回调函数（仅在加载失败时可能被调用）
 * @param props.className 组件元素类名
 * @param props.maxWidth 最大宽度
 * @returns React Node content
 */
export default function MediaView(props: MediaViewProps) {
    const [Lang] = useLang()
    const {status, className, onRequestReload, mediaType, brokenMessage, source, thumbnail, progress, hint, loadingText, controls, sourceType, maxWidth} = props;

    const brokenView = (
        <div
            className={classes('media-holder-broken gray-pale text-gray', className, {state: !!onRequestReload})}
            onClick={onRequestReload}
        >
            <Icon name={mediaType === 'image' ? 'image-off' : 'image-broken'} className="icon-3x" />
            <div className="text -text-center">
                {brokenMessage}
                {onRequestReload ? <div className="strong">{Lang.string('common.rerequest')}</div> : null}
            </div>
        </div>
    );

    /**
     * 处理视频开始播放事件
     * @param e 事件对象
     */
    const handleVideoPlay = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
        const videoElm = e.target as HTMLVideoElement;
        const quality = videoElm.getVideoPlaybackQuality();
        if (quality?.totalVideoFrames === 0) {
            showMessager(Lang.string('file.cannotPreviewTheFile'));
            videoElm.remove();
        }
    };

    if (status === 'broken') {
        return brokenView;
    }

    if (status === 'loading') {
        const mediaIconTypes = {
            image: 'image-filter-hdr',
            video: 'video',
            audio: 'music',
        };
        return (
            <div className={`media-holder-progress${!progress ? ' media-holder-waiting' : ''}`}>
                <div className="dock center-content">
                    <Icon name={mediaIconTypes[mediaType]} className="muted icon-5x" />
                </div>
                <div className="text -flex -items-center">
                    <Icon name="loading" className="-inline-block spin text-shadow-white" /> &nbsp;
                    {maxWidth < 120 ? '' : loadingText}{progress ? `${Math.floor(progress)}%` : ''}
                </div>
                <div className="progress">
                    <div className="bar" style={{width: progress ? `${progress}%` : '100%'}} />
                </div>
            </div>
        );
    }

    if (source) {
        if (mediaType === 'video' || mediaType === 'audio') {
            const sourcesViews = Array.isArray(source)
                ? source.map(({src, type}, key) => (
                    <source src={src} type={type} key={key ?? src} />
                ))
                : <source src={source} type={sourceType} />;
            if (mediaType === 'video') {
                return (
                    <video controls={controls} muted autoPlay className="media-holder-media" onPlay={handleVideoPlay}>
                        {sourcesViews}
                        {brokenView}
                    </video>
                );
            }
            return (
                <audio controls={controls} className="media-holder-media">
                    {sourcesViews}
                    {brokenView}
                </audio>
            );
        }
        return (
            <img
                className="media-holder-media"
                src={source as string}
                alt={hint || source as string}
                draggable="false"
                data-broken={brokenMessage}
                onError={handleMediaBroken}
            />
        );
    }

    if (thumbnail) {
        return (
            <img
                src={thumbnail}
                alt={hint || source as string}
                draggable="false"
                data-broken={brokenMessage}
                onError={handleMediaBroken}
            />
        );
    }

    return brokenView;
}
