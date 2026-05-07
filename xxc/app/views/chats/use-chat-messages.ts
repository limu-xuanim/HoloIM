import {useState, useEffect} from 'react';
import {ChatMessagesStoreModule} from '~/app/entries/vars/ChatMessagesStoreModule';

const {default: chatMessagesStore} = ChatMessagesStoreModule;

/**
 * 多个会话消息 Hook
 * @param ids 会话消息 ID 列表
 * @param cgid 会话 GID
 * @returns 数组第一个结果为会话消息
 */
export default function useChatMessages(ids: number[], cgid: string): ChatMessage[] {
    const [chatMessageKeeper, setChatMessageKeeper] = useState(() => chatMessagesStore.getMessages(ids, cgid));
    const idList = ids.join(',');

    useEffect(() => {
        setChatMessageKeeper(chatMessagesStore.getMessages(ids, cgid));
        return chatMessagesStore.unsubscribe.bind(
            chatMessagesStore,
            chatMessagesStore.subscribe(ids, () => setChatMessageKeeper(chatMessagesStore.getMessages(ids, cgid))),
        );

    }, [cgid, idList]);

    return chatMessageKeeper;
}
