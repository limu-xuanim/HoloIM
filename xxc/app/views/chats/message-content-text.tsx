import {memo} from 'react';
import {classes} from '~/app/utils/html-helper';
import MessageContentRich from './message-content-rich';

type MessageContentTextProps = {message: ChatMessage}
    & Partial<{contentConverter: (content: string, msg: ChatMessage) => string;}>
    & React.HTMLAttributes<HTMLDivElement>;

/**
 * 文本消息内容组件
 * @param props React 组件属性对象
 * @param props.message 会话消息对象
 * @param props.className 类名
 * @param props.contentConverter 文本内容转化回调函数
 * @returns JSX.Element
 */
function MessageContentText(props: MessageContentTextProps) {
    const {
        message,
        className,
        contentConverter,
        ...others
    } = props;

    return (
        <MessageContentRich
            className={classes(
                'app-message-content-text content',
                className,
                {'is-content-block': message.isBlockContent},
                {'is-plain-text': message.isPlainTextContent}
            )}
            message={message}
            contentConverter={contentConverter}
            {...others}
        />
    );
}

export default memo(MessageContentText);
