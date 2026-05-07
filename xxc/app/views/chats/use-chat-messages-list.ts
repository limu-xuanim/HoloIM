import {useState, useEffect} from 'react';
import chatMessagesListStore from '../../core/im/chat-messages-list-store';

/**
 * 会话消息列表 Hook
 * @param cgid 会话 GID
 * @returns 会话消息 ID 列表
 */
export default function useChatMessagesList(cgid: string) {
    const [messagesList, setMessagesList] = useState(() => chatMessagesListStore.getList(cgid));

    useEffect(() => {
        setMessagesList(chatMessagesListStore.getList(cgid));
        return chatMessagesListStore.unsubscribe.bind(
            chatMessagesListStore,
            chatMessagesListStore.subscribe(cgid, setMessagesList)
        );
    }, [cgid]);

    return messagesList;
}
