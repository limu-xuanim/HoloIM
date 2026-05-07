import {useState, useEffect} from 'react';
import {ChatMessagesStoreModule} from '~/app/entries/vars/ChatMessagesStoreModule';

const {default: chatMessagesStore} = ChatMessagesStoreModule;

/**
 * 会话消息 Hook
 * @param id 会话消息 ID
 * @returns 数组第一个结果为会话消息
 */
export default function useChatMessage(id: number): [ChatMessage] {
    const [chatMessageKeeper, setChatMessageKeeper] = useState<[ChatMessage]>(() => [chatMessagesStore.getMessage(id)]);

    useEffect(() => {
        setChatMessageKeeper([chatMessagesStore.getMessage(id)]);
        return chatMessagesStore.unsubscribe.bind(
            chatMessagesStore,
            chatMessagesStore.subscribe(id, chatMessage => setChatMessageKeeper([chatMessage]))
        );
    }, [id]);

    return chatMessageKeeper;
}
