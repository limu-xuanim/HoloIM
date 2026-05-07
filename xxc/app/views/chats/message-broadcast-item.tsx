import {memo} from 'react';
import {classes} from '../../utils/html-helper';
import MessageRibbon from './message-ribbon';
import MessageContentRich from './message-content-rich';

type MessageBroadcastItemProps = {
    message: ChatMessage;
    contentConverter?: (content: string, msg: ChatMessage) => string;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * 广播消息组件
 * @param props React 组件属性对象
 * @param props.message 会话消息对象
 * @param props.className 类名
 * @param props.contentConverter 文本内容转化回调函数
 * @returns JSX.Element
 */
function MessageBroadcastItem(props: MessageBroadcastItemProps) {
    const {
        message, className, contentConverter, ...others
    } = props;

    return (
        <div className={classes('center-content', className)} {...others}>
            <MessageRibbon date={message.date} avatar={{className: 'avatar-sm -flex-none', icon: 'bell-outline text-secondary'}}>
                <MessageContentRich className="content markdown-content" message={message} contentConverter={contentConverter} />
            </MessageRibbon>
        </div>
    );
}

export default memo(MessageBroadcastItem);
