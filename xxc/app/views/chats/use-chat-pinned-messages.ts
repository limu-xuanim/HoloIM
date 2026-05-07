import {useState, useEffect} from 'react';
import {isDiffList} from '../../utils/list-helper';
import chatsStore from '../../core/im/chats-store';
import chatMessagesStore from '../../core/im/chat-messages-store';

/**
 * 获取会话已置顶的消息 ID 列表
 * @param cgid 会话 GID
 * @returns 消息 ID 列表
 */
function getChatPinnedMessage(cgid: string): number[] {
    const chat = chatsStore.getChat(cgid, false);
    return chat ? chat.pinnedMessages : [];
}

/**
 * 会话已置顶的消息 ID 列表 Hook
 * @param cgid 会话 GID
 * @returns 消息 ID 列表
 */
export default function useChatPinnedMessages(cgid: string): number[] {
    const [pinnedMessages, setPinnedMessages] = useState(() => getChatPinnedMessage(cgid));

    useEffect(() => {
        const trySetPinnedMessages = () => {
            const newPinnedMessageIds = getChatPinnedMessage(cgid);
            if (isDiffList(newPinnedMessageIds, pinnedMessages)) {
                chatMessagesStore.asyncGetMessages(cgid, newPinnedMessageIds)
                    .then(() => {
                        setPinnedMessages(newPinnedMessageIds);
                    })
                    .catch(console.error);
            }
        };
        trySetPinnedMessages();
        return chatsStore.unsubscribe.bind(
            chatsStore,
            chatsStore.subscribe(cgid, trySetPinnedMessages)
        );
    }, [cgid, pinnedMessages]);

    return pinnedMessages;
}
