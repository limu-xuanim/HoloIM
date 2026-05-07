import {memo, useEffect} from 'react';
import {classes} from '~/app/utils/html-helper';
import Lang from '~/app/core/lang';
import MediaHolder from '~/app/components/media-holder';
import {downloadFileToCache, getFileNetworkErrorMessage} from '~/app/core/files/files-ui';
import useMessageFile from '../files/use-message-file';
import useUid from '~/app/components/hooks/use-uid';
import {getPlatformType} from '~/app/core/ui/browser-window';
import Icon from '~/app/components/icon';
import useChatMessageUnread from './use-chat-message-unread';
import {downloadFile} from '~/app/core/files/files-network';
import {PlatformType} from '~/app/constants';
import {showChatMessageImagePreivew} from '~/app/entries/vars/showChatMessageImagePreivew';

/**
 * 处理双击媒体事件
 * @param fileData 文件对象
 */
function handleMediaDoubleClick(fileData: FileData) {
    if (fileData.previewType !== 'image') {
        return;
    }
    const {viewUrl, remoteUrl} = fileData;
    if (viewUrl || remoteUrl) {
        showChatMessageImagePreivew(fileData.cgid, fileData.messageID, {imageInfo: {src: viewUrl ?? remoteUrl}, id: `imageFile-${fileData.gid}`});
    }
}

export type MediaType = 'image'|'video'|'audio';
export type MediaStatus = 'broken'|'loading'|'ok';

type HolderProps = {
    width: number;
    height: number;
    thumbnailWidth: number;
    thumbnailHeight: number;
    hint: string;
    mediaType: MediaType;
    sourceType: string;
    brokenMessage: string;
} & Partial<{
    status: MediaStatus;
    progress: number;
    thumbnail: string;
    loadingText: string;
    source: string;
    onRequestReload: () => void;
    onDoubleClick: () => void;
}>;

/**
 * 获取媒体占位组件配置
 * @param file 文件对象
 * @returns 媒体占位组件配置对象
 */
function getMediaHolderProps(file: FileData) {
    const holderProps: HolderProps = {
        width: file.mediaWidth,
        height: file.mediaHeight,
        thumbnailWidth: file.thumbnailWidth,
        thumbnailHeight: file.thumbnailHeight,
        hint: file.name,
        mediaType: (file.previewType as MediaType) || 'image',
        sourceType: file.mimeType,
        brokenMessage: getFileNetworkErrorMessage(file) ?? Lang.string('file.downloadFailed'),
    };

    const {networking} = file;
    if (networking.error) {
        holderProps.status = 'broken';
        holderProps.onRequestReload = downloadFileToCache.bind(null, file, {showError: true});
    } else if (networking.isInProgress) {
        holderProps.status = 'loading';
        holderProps.progress = networking.progress;
        holderProps.loadingText = Lang.string('file.loading');
        if (file.isSendByMe) {
            holderProps.thumbnail = file.thumbnailViewUrl;
        }
    } else if (file.thumbnailViewUrl) {
        holderProps.status = 'ok';
        holderProps.source = file.thumbnailViewUrl;
        holderProps.onDoubleClick = handleMediaDoubleClick.bind(null, file);
    } else if (file.thumbnailRemoteUrl) {
        holderProps.status = 'ok';
        holderProps.source = file.thumbnailRemoteUrl;
        holderProps.onDoubleClick = handleMediaDoubleClick.bind(null, file);
    } else if (!file.networking.isDownloadFail) {
        holderProps.status = 'loading';
        holderProps.progress = networking.progress;
        holderProps.loadingText = Lang.string('file.loading');
    } else {
        holderProps.status = 'broken';
        holderProps.onRequestReload = downloadFileToCache.bind(null, file, {showError: true});
    }

    return holderProps;
}

type MessageContentMediaProps = {
    message: ChatMessage;
} & Partial<{
    className: string;
    mediaHolderProps: Partial<HolderProps>;
}>;

/**
 * 聊天消息媒体内容界面组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param  props React 组件属性对象
 * @returns React Node content
 */
function MessageContentMedia(props: MessageContentMediaProps) {
    const {message, className, mediaHolderProps} = props;
    const id = useUid();
    const file = useMessageFile(message);
    const {cgid, index} = message;
    const [unread] = useChatMessageUnread(cgid, index);

    if (getPlatformType() !== PlatformType.browser) {
        // biome-ignore lint/correctness/useHookAtTopLevel: this will not change during the render.
        useEffect(() => {
            if (!file) {
                return;
            }
            if (file.cacheThumbnailPath) {

                file.checkCachePath(true).then((isExists: boolean) => {
                    if (!isExists) {
                        downloadFileToCache(file, {isThumb: file.hasThumb});
                    }
                });
            } else {
                downloadFileToCache(file, {isThumb: file.hasThumb});
            }
        }, [file]);

        // biome-ignore lint/correctness/useHookAtTopLevel: this will not change during the render.
        useEffect(() => {
            const intersectionObserver = new IntersectionObserver((entries) => {
                const visible = entries.find(entry => entry.target.id === id && entry.intersectionRatio > 0);
                if (visible && !unread && file.needAutoLoadOriginImage) {
                    downloadFile(file);
                }
            });

            intersectionObserver.observe(document.getElementById(id));

            return () => intersectionObserver?.disconnect();
        }, [file, id, unread]);
    }

    if (!file) {
        return null;
    }

    const mediaProps = getMediaHolderProps(file);
    if (mediaHolderProps) {
        Object.assign(mediaProps, mediaHolderProps);
    }

    return (
        <MediaHolder
            id={id}
            className={classes('app-message-content-media', className)}
            {...mediaProps}
        >
            {
                file.needLoadIamgeBtn && getPlatformType() !== PlatformType.browser
                    ? (
                        <button className="image-load btn btn-xs" onClick={downloadFileToCache.bind(null, file)} type="button">
                            <Icon name="cloud-download" color="#fff" size={18} />
                            <span>{Lang.string('menu.image.download')}</span>
                        </button>
                    )
                    : null
            }
        </MediaHolder>
    );
}

export default memo(MessageContentMedia);
