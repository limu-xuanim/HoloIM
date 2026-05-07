import {useState, useEffect, memo} from 'react';
import chatMessagesStore from '../../core/im/chat-messages-store';
import Spinner from '../../components/spinner';
import MessageListItem from './message-list-item';
import Lang from '../../core/lang';

type MessageViewProps = {
    message: number | ChatMessage;
    cgid: string;
}

/**
 * 消息详情组件
 */
function MessageView(props: MessageViewProps) {
    const {message: messageInfo, cgid, ...others} = props;

    const [message, setMessage] = useState(() => (typeof messageInfo === 'number' ? null : messageInfo));

    useEffect(() => {
        if (typeof messageInfo === 'number') {
            const tryLoadMessage = async () => {
                const messageData = await chatMessagesStore.asyncGetMessage(cgid, messageInfo);
                setMessage(messageData);
            };
            tryLoadMessage();
        }
    }, [messageInfo, cgid]);

    if (!message) {
        return <Spinner className="has-padding-lg" label={Lang.string('common.loading')} />;
    }

    return (
        <MessageListItem
            message={message}
            ignoreStatus
            showDateDivider={false}
            headDateFormat="yyyy-MM-dd hh:ss"
            {...others}
        />
    );
}

export default memo(MessageView);
