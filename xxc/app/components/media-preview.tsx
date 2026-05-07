import {useEffect, useRef, useState} from 'react';
import Icon from './icon';
import AdvancedImageViewer from './advanced-image-viewer';
import {ImageViewerActions} from './image-viewer-actions';
import MediaHolder from './media-holder';
import {classes} from '../utils/html-helper';
import throttle from '../utils/throttle';
import type {ChatMessageImageObtainer} from '../core/im/chat-message-image-obtainer';

type Current = PickByValueType<PickByValueType<MediaPreviewProps, object>['obtainer'], object>['current'];

/**
 * 处理背景点击事件
 * @param event 事件对象
 */
const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if ((event.target as HTMLElement).closest('a,button,img')) {
        event.stopPropagation();
    }
};

type MediaPreviewProps = {
    obtainer: ChatMessageImageObtainer|{current: {src: string;};};
    getMessage: (id: number) => ChatMessage;
} & Partial<{
    onRequestClose: () => void;
    onShow: (current: Current) => void;
    title: string|boolean;
    showActions: boolean;
    prevText: string;
    nextText: string;
    obtainText: string;
    className: string;
    zoomInText: string;
    zoomOutText: string;
    rotate90Text: string;
    zoomResetText: string;
    retracted: string;
    onContextMenu: (position: {x: number; y: number;}, src: string, sizeInfo: {width: number; height: number;}) => void;
    saveAsText: string;
    handleMediaSaveAs: (src: string) => void;
}>;

/**
 * 媒体预览组件，支持媒体、视频、音频
 */
export default function MediaPreview(props: MediaPreviewProps) {
    const {
        prevText = 'Previous',
        nextText = 'Next',
        obtainText = 'Obtain',
        onRequestClose,
        obtainer,
        title,
        showActions = false,
        className,
        zoomInText,
        zoomOutText,
        zoomResetText,
        rotate90Text,
        saveAsText,
        retracted,
        getMessage,
        onShow,
        handleMediaSaveAs,
        onContextMenu,
    } = props;

    if (!obtainer || (!obtainer.current && !('obtainCurrent' in obtainer && obtainer.obtainCurrent))) {
        throw new Error('The prop "obtainer" of MediaPreview must be a object and implement "current" prop or "obtainCurrent" func to provide current image information.');
    }

    const [loading, setLoading] = useState(!obtainer.current);
    const [current, setCurrent] = useState<PickByValueType<ChatMessageImageObtainer, object>['current']>(obtainer.current ?? {});
    const [showBtns, setShowBtns] = useState(true);
    const [movable, setMovable] = useState(true);
    const mouseMoveTimerRef = useRef<NodeJS.Timeout>();
    const unmountedRef = useRef(false);
    const advancedImageViewerRef = useRef<AdvancedImageViewer>();

    useEffect(() => {
        return () => {
            unmountedRef.current = true;
        };
    }, []);

    useEffect(() => {
        if ('obtainCurrent' in obtainer) {
            obtainer.obtainCurrent?.()
                .then(updateCurrentMedia)
                .catch(console.error);
        }
        setTimeout(() => {
            setShowBtns(false);
        }, 2 * 1000);
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [obtainer]);

     /**
     * 处理鼠标移动事件
     */
    const handleMouseMove = throttle(() => {
        if (showBtns === false) {
            setShowBtns(true);
        }

        clearTimeout(mouseMoveTimerRef.current);
        mouseMoveTimerRef.current = setTimeout(() => {
            setShowBtns(false);
        }, 2 * 1000);
    });

    /**
     * 重新获取当前媒体信息
     */
    const reloadMedia = () => {
        if ('obtain' in obtainer) {
            obtainer.obtain?.(current)
                .then(updateCurrentMedia)
                .catch(console.error);
        }
    };

    /**
     * 更新当前媒体信息
     * @param current 当前媒体信息
     */
    const updateCurrentMedia = (current: Current) => {
        if (unmountedRef.current || !current) {
            return;
        }

        setCurrent(current);
        setLoading(false);
        onShow?.(current);
    };

    /**
     * 处理切换到上一张媒体
     */
    const handleSwithPrevMedia = () => {
        if (!('obtainPrev' in obtainer) || !obtainer.obtainPrev) {
            return;
        }
        if ('prev' in current && current.prev === false) {
            return;
        }

        setLoading(true);
        if ('obtainPrev' in obtainer) {
            obtainer.obtainPrev(current)
                .then(updateCurrentMedia)
                .catch(console.error);
        }
    };

    /**
     * 处理切换到下一张媒体
     */
    const handleSwithNextMedia = () => {
        if (!('obtainNext' in obtainer) || !obtainer.obtainNext) {
            return;
        }
        if ('next' in current && current.next === false) {
            return;
        }

        setLoading(true);
        obtainer.obtainNext(current)
            .then(updateCurrentMedia)
            .catch(console.error);
    };

    /**
     * 处理按键事件
     * @param event 事件对象
     */
    const handleKeyDown = (event: KeyboardEvent) => {
        const {code} = event;
        if (code === 'ArrowUp') {
            zoomIn();
            return;
        }
        if (code === 'ArrowLeft') {
            handleSwithPrevMedia();
            return;
        }
        if (code === 'ArrowDown') {
            zoomOut();
            return;
        }
        if (code === 'ArrowRight') {
            handleSwithNextMedia();
        }
    };

    /**
     * 重置对媒体的变形操作
     * @param event 事件对象
     */
    const resetTransforms = (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        (event?.target as HTMLElement).closest<HTMLButtonElement|HTMLAnchorElement>('button,a')?.blur();
        advancedImageViewerRef.current?.resetTransforms();
    };

    /**
     * 放大
     * @param event 事件对象
     */
    const zoomIn = (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        (event?.target as HTMLElement).closest<HTMLButtonElement|HTMLAnchorElement>('button,a')?.blur();
        advancedImageViewerRef.current?.zoomIn();
    };

    /**
     * 缩小
     * @param event 事件对象
     */
    const zoomOut = (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        (event?.target as HTMLElement).closest<HTMLButtonElement|HTMLAnchorElement>('button,a')?.blur();
        advancedImageViewerRef.current?.zoomOut();
    };

    /**
     * 旋转90度
     * @param event 事件对象
     */
    const rotate90 = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        (event?.target as HTMLElement).closest<HTMLButtonElement|HTMLAnchorElement>('button,a')?.blur();
        const advancedImageViewer = advancedImageViewerRef.current;
        advancedImageViewer?.rotate90();
        requestAnimationFrame(() => {
            setMovable(Boolean(advancedImageViewer?.isMovable));
        });
    };

    /**
     * 处理右键事件
     * @param event 事件对象
     */
    const handleContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const position = {
            x: event.clientX,
            y: event.clientY,
        };
        onContextMenu?.(
            position,
            current.src,
            {
                width: advancedImageViewerRef.current.imageElement.naturalWidth,
                height: advancedImageViewerRef.current.imageElement.naturalHeight,
            }
        );
        event.preventDefault();
    };

    /**
     * 图片另存为
     * @param event 事件对象
     */
    const handleActionSaveAs = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        ((event?.target as HTMLElement).closest('button,a') as HTMLButtonElement|HTMLAnchorElement)?.blur();
        handleMediaSaveAs?.(current.src);
    };

    const {prev, next, src, mediaType = 'image', title: mediaTitle = ''} = current
    const contentViews: JSX.Element[] = [];
    let actionsView: JSX.Element = null;
    let {errorMessage} = current;

    const id = current.data?.messageID;
    if (id) {
        const message = getMessage(id);
        if (message?.retracted && !message.data.forwardFrom && !errorMessage) {
            errorMessage = retracted;
        }
    }

    if (loading) {
        contentViews.push(
            <Icon
                name="mdi-loading"
                className="spin text-gray -inline-block"
                size={64}
                key="loading"
            />
        );
    } else {
        if (prev && (obtainer as ChatMessageImageObtainer).obtainPrev) {
            contentViews.push(
                <a
                    className={classes('switch-image-btn', 'prev-image-btn', 'center-content', '-rounded', '-rounded-l-none', {show: showBtns})}
                    title={prevText}
                    onMouseUp={handleSwithPrevMedia}
                    key="prevBtn"
                >
                    <Icon name="mdi-chevron-left" size={80} />
                </a>
            );
        }

        if (errorMessage) {
            contentViews.push(
                <div className="-text-center" key="error">
                    <div className="lead space" key="errorMessage">{errorMessage}</div>
                    <a className="btn primary -rounded" onClick={reloadMedia}>
                        <Icon name="mdi-reload" />
                        <span className="text">{obtainText}</span>
                    </a>
                </div>
            );
        } else if (mediaType === 'audio' || mediaType === 'video') {
            contentViews.push(
                <MediaHolder
                    source={src}
                    mediaType={mediaType}
                    maxWidth={null}
                    maxHeight={null}
                />
            );
        } else {
            contentViews.push(
                <AdvancedImageViewer
                    key="imageViewer"
                    onRequestClose={onRequestClose}
                    onKeyDown={handleKeyDown}
                    src={src}
                    ref={advancedImageViewerRef}
                />
            );

            if (showActions) {
                actionsView = (
                    <div className="-flex -justify-center dock dock-bottom has-padding-lg">
                        <ImageViewerActions
                            className={classes({show: showBtns})}
                            zoomOut={zoomOut}
                            zoomIn={zoomIn}
                            resetTransforms={resetTransforms}
                            rotate90={rotate90}
                            zoomInText={zoomInText}
                            zoomOutText={zoomOutText}
                            zoomResetText={zoomResetText}
                            rotate90Text={rotate90Text}
                            saveAsText={saveAsText}
                            handleActionSaveAs={handleActionSaveAs}
                            movable={movable}
                        />
                    </div>
                );
            }
        }

        if (next && (obtainer as ChatMessageImageObtainer).obtainNext) {
            contentViews.push(
                <a
                    className={classes('switch-image-btn', 'next-image-btn', 'center-content', '-rounded', '-rounded-r-none', {show: showBtns})}
                    title={nextText}
                    onMouseUp={handleSwithNextMedia}
                    key="nextBtn"
                >
                    <Icon name="mdi-chevron-right" size={80} />
                </a>
            );
        }
    }

    let titleView = null;
    if (title) {
        const icon = mediaType === 'video' ? 'mdi-video' : (mediaType === 'audio' ? 'mdi-music' : 'mdi-image-search-outline');
        titleView = (
            <div className="title row single !-items-center !-flex">
                <Icon name={icon} size={16} className="muted" /> &nbsp;
                <span className="text">
                    {title !== true ? title : ''}
                    {title !== true && mediaTitle ? ' - ' : ''}
                    {mediaTitle}
                </span>
            </div>
        );
    }

    return (
        <div className={classes('media-preview column single', className)} onClick={handleClick}>
            <header className="-flex-none heading">
                {titleView}
            </header>
            <div
                className="content center-content -flex-auto"
                onContextMenu={handleContextMenu}
            >
                {contentViews}
            </div>
            {actionsView}
        </div>
    );
}
