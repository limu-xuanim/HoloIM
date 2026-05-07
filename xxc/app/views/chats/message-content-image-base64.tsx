import {memo, useCallback} from 'react';
import {classes} from '~/app/utils/html-helper';
import Lang from '~/app/core/lang';
import {showChatMessageImagePreivew} from './chat-message-image-preview';

/**
 * 处理图片加载失败事件
 * @param event 事件对象
 */
function handleImageError(event: React.SyntheticEvent<HTMLImageElement, Event>) {
    const elm = event.target as HTMLElement;
    elm.classList.add('broken');
    elm.setAttribute('data-broken', Lang.string('file.downloadFailed'));
}

type MessageContentImageBase64Props = {message: ChatMessage}
    & Partial<{imgHolderProps: React.CSSProperties;}>
    & React.HTMLAttributes<HTMLImageElement>;

/**
 * base64 图片消息内容组件
 * @param props React 组件属性对象
 * @param props.message 会话消息对象
 * @param props.className 类名
 * @returns JSX.Element
 */
function MessageContentImageBase64(props: MessageContentImageBase64Props) {
    const {
        message,
        className,
        imgHolderProps,
        ...others
    } = props;

    const {imageContent: image, id: messageID, cgid} = message;
    const imageContent = image.content;
    const handleImageDoubleClick = useCallback(() => {
        showChatMessageImagePreivew(cgid, messageID, {imageInfo: {src: imageContent}});
    }, [imageContent, messageID, cgid]);

    return (
        <img
            className={classes('app-message-content-image img-base64', className)}
            onError={handleImageError}
            onDoubleClick={handleImageDoubleClick}
            src={imageContent}
            alt={image.type}
            style={imgHolderProps}
            {...others}
        />
    );
}

export default memo(MessageContentImageBase64);
