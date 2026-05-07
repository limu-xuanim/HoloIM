import {useState, useEffect} from 'react';
import chatsStore from '../../core/im/chats-store';

/**
 * 会话消息未读状态
 * @param gid 会话 GID
 * @param index 消息 ID
 * @returns 分别返回是否未读以及是否为最后阅读的消息
 */
export default function useChatMessageUnread(gid: string, index: number): [boolean, boolean] {
    const [unread, setUnread] = useState(() => !!(chatsStore.getChat(gid)?.isUnreadMessage(index)));
    const [isLastRead, setIsLastRead] = useState(() => {
        const chat = chatsStore.getChat(gid);
        if (!chat) {
            return false;
        }
        return chat.lastReadMessageIndex === index && chat.lastMessageIndex !== index;
    });

    useEffect(() => {
        const chat = chatsStore.getChat(gid);
        setUnread(chat ? chat.isUnreadMessage(index) : false);
        setIsLastRead(chat ? (chat.lastReadMessageIndex === index && chat.lastMessageIndex !== index) : false);
        return chatsStore.unsubscribe.bind(
            chatsStore,
            chatsStore.subscribe(gid, (theChat: Chat) => {
                setUnread(theChat.isUnreadMessage(index));
                setIsLastRead(theChat.lastReadMessageIndex === index && theChat.lastMessageIndex !== index);
            })
        );
    }, [gid, index]);

    return [unread, isLastRead];
}
