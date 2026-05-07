import {useState, useEffect} from 'react';
import chatsStore from '../../core/im/chats-store';
import {subscribeUnreadMessagesChange} from '../../core/im/chat-message-notice';

/**
 * 未读消息数 Hook
 * @returns 未读消息数
 */
export default function useUnreadMessagesCount(): number {
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(chatsStore.getUnreadMessageCount());

    useEffect(() => {
        const subscription = subscribeUnreadMessagesChange(setUnreadMessagesCount);
        return () => subscription.unsubscribe();
    }, []);

    return unreadMessagesCount;
}
