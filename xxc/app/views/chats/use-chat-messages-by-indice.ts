import {useState, useEffect} from 'react';
import chatMessagesStore from '~/app/core/im/chat-messages-store';

/**
 * 多个会话消息 Hook
 * @param indice 会话消息 index 列表
 * @param cgid 会话 GID
 * @returns 数组第一个结果为会话消息
 */
export default function useChatMessagesByIndice(indice: number[], cgid: string): ChatMessage[] {
    const [chatMessageKeeper, setChatMessageKeeper] = useState(() => chatMessagesStore.getMessages(indice, cgid, 'index'));
    const indiceList = indice.join(',');

    useEffect(() => {
        setChatMessageKeeper(chatMessagesStore.getMessages(indice, cgid, 'index'));
        return chatMessagesStore.unsubscribe.bind(
            chatMessagesStore,
            chatMessagesStore.subscribeByIndices(indice, cgid, () => setChatMessageKeeper(chatMessagesStore.getMessages(indice, cgid, 'index'))),
        );

    }, [cgid, indiceList]);

    return chatMessageKeeper;
}
