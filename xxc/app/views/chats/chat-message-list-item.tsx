import {memo} from 'react';
import MessageListItem from './message-list-item';
import useChatMessagesByIndice from './use-chat-messages-by-indice';

type ChatMessageListItemProps = {
    cgid: string;
    messageIndex: number;
    prevMessageIndex?: number;
    selection?: boolean;
};

/**
 * 会话消息列表项，此组件会跟踪 store 中的消息对象变更，如果不需要跟踪变更请使用 MessageListItem
 * @param props React 组件属性对象
 * @param props.messageIndex 消息 ID
 * @param props.cgid 会话 GID
 * @param props.prevMessageIndex 在列表中的上一个消息 ID
 * @returns JSX.Element
 */
function ChatMessageListItem(props: ChatMessageListItemProps) {
    const {messageIndex, prevMessageIndex = 0, cgid, ...others} = props;

    const messageIndices = [messageIndex, prevMessageIndex].filter(Boolean);
    const [message, prevMessage] = useChatMessagesByIndice(messageIndices, cgid);

    if (!message) {
        return null;
    }

    return <MessageListItem id={message.id} prevMessage={prevMessage} message={message} {...others} />;
}

export default memo(ChatMessageListItem);
