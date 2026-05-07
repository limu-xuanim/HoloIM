import {useState, useEffect, useRef} from 'react';
import {ChatMessagesStoreModule} from '~/app/entries/vars/ChatMessagesStoreModule';

const {default: chatMessagesStore} = ChatMessagesStoreModule;

/**
 * 会话消息 Hook，区别于 useChatMessage，此方法在本地没有找到消息时会查找数据库或从服务器获取
 * @param id 会话消息 ID
 * @param cgid 消息所属会话
 * @returns 数组第一个结果为会话消息
 */
export default function useChatMessageSafe(id: number, cgid: string) {
    const [chatMessageKeeper, setChatMessageKeeper] = useState<[ChatMessage | null]>(() => [chatMessagesStore.getMessage(id, cgid)]);
    const fetchIDRef = useRef<number>();

    useEffect(() => {
        if (chatMessagesStore.hasCacheItem(id)) {
            return setChatMessageKeeper([chatMessagesStore.getMessage(id, cgid)]);
        }
        fetchIDRef.current = id;
        setChatMessageKeeper([null]);
        const fetchMessage = async () => {
            const message = await chatMessagesStore.asyncGetMessage(cgid, id, true);
            if (fetchIDRef.current === id) {
                setChatMessageKeeper([message]);
            }
        };
        fetchMessage();
    }, [id, cgid]);

    useEffect(() => {
        setChatMessageKeeper([chatMessagesStore.getMessage(id)]);
        return chatMessagesStore.unsubscribe.bind(
            chatMessagesStore,
            chatMessagesStore.subscribe(id, chatMessage => setChatMessageKeeper([chatMessage]))
        );
    }, [id]);

    return chatMessageKeeper == null ? [chatMessageKeeper] : chatMessageKeeper;
}
