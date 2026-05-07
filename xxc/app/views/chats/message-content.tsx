import {memo} from 'react';
import {classes} from '~/app/utils/html-helper';
import ErrorBoundary from '~/app/components/error-boundary';
import MessageContentMedia from './message-content-media';
import MessageContentText from './message-content-text';
import MessageContentRetracted from './message-content-retracted';
import MessageContentNotification from './message-content-notification';
import MessageContentObject from './message-content-object';
import MessageContentEmotion from './message-content-emotion';
import MessageContentImageBase64 from './message-content-image-base64';
import type {NotificationMessage} from '~/app/core/im/notification-message';
type MessageContentProps = {
    message: ChatMessage;
    contentConverter?: (content: string, msg: ChatMessage) => string;
    imgHolderProps?: React.CSSProperties;
    className?: string;
};

/**
 * 消息内容组件
 * @param props React 组件属性对象
 * @param props.message 会话消息对象
 * @param props.className 类名
 * @param props.contentConverter 文本内容转化回调函数
 * @returns JSX.Element
 */
function MessageContent(props: MessageContentProps) {
    const {className, message, imgHolderProps, contentConverter} = props;

    if (message.retracted) {
        return (
            <MessageContentRetracted
                className={classes('app-message-content', className)}
                message={message}
            />
        );
    }
    if ((message as NotificationMessage).isNotification) {
        return (
            <MessageContentNotification
                className={classes('app-message-content', className)}
                message={message as NotificationMessage}
                contentConverter={contentConverter}
            />
        );
    }
    if (message.isEmotionContent) {
        return (
            <MessageContentEmotion
                className={classes('app-message-content', className)}
                message={message}
            />
        );
    }
    if (message.isImageContent) {
        if (message.imageContent.type === 'base64') {
            return (
                <MessageContentImageBase64
                    className={classes('app-message-content', className)}
                    message={message}
                    imgHolderProps={imgHolderProps}
                />
            );
        }

        return (
            <MessageContentMedia
                className={classes('app-message-content', className)}
                message={message}
            />
        );
    }
    if (message.isObjectContent) {
        return (
            <MessageContentObject
                className={classes('app-message-content', className)}
                message={message}
            />
        );
    }
    return (
        <MessageContentText
            className={classes('app-message-content', className)}
            message={message}
            contentConverter={contentConverter}
        />
    );
}

export default memo((props: MessageContentProps) => (
    <ErrorBoundary>
        <MessageContent
            {...props}
        />
    </ErrorBoundary>
));
