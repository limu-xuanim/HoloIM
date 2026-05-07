import {memo} from 'react';
import {isToday} from '../../utils/date-helper';
import ChatMessage from '../../core/im/chat-message';
import MessageContentUrl from './message-content-url';

type MessageContentObjectProps = {
    message: ChatMessage;
    sleepUrlCard?: boolean | 'auto';
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * 消息对象类型
 * @param props React 组件属性对象
 * @param props.message 消息组件
 * @param props.sleepUrlCard 是否暂不自动加载 URL 卡片内容
 * @returns React Node content
 */
function MessageContentObject(props: MessageContentObjectProps) {
    const {message, sleepUrlCard = 'auto', ...others} = props;
    const {objectContent} = message;

    if (objectContent && objectContent.type === ChatMessage.OBJECT_TYPES.url && objectContent.url) {
        const sleep = sleepUrlCard === 'auto' ? !isToday(message.date) : sleepUrlCard;
        return <MessageContentUrl sleep={sleep} message={message} {...others} />;
    }
    return <div className="box red-pale" {...others}>[Unknown Object]{DEBUG ? message.content : null}</div>;
}

export default memo(MessageContentObject);
