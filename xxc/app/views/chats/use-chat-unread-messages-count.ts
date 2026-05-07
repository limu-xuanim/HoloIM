import {useState, useEffect} from 'react';
import chatsStore from '../../core/im/chats-store';
import {subscribeUnreadMessagesChange} from '../../core/im/chat-message-notice';

/**
 * 会话未读消息数 Hook
 * @param gid 会话 GID
 * @returns 未读消息数
 */
export default function useChatUnreadMessagesCount(gid: string): number {
    // TODO 检查为什么刚登录时会传入与当前用户无关的会话
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(chatsStore.getChat(gid)?.unreadMessagesCount ?? 0);

    useEffect(() => {
        const subscription = subscribeUnreadMessagesChange(() => {
            const chat = chatsStore.getChat(gid);
            if (!chat) {
                return;
            }
            setUnreadMessagesCount(chat.unreadMessagesCount);
        });
        return () => subscription.unsubscribe();
    }, [gid]);

    return unreadMessagesCount;
}
