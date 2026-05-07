import {useState, useEffect} from 'react';
import {chatsStore} from '~/app/entries/vars/chatsStore';

/**
 * 会话 Hook
 * @param gid 会话 GID
 * @returns 数组第一个结果为会话
 */
export default function useChat(gid: string) {
    const [chatKeeper, setChatKeeper] = useState(() => [chatsStore.getChat(gid)]);

    useEffect(() => {
        setChatKeeper([chatsStore.getChat(gid)]);
        return chatsStore.unsubscribe.bind(
            chatsStore,
            chatsStore.subscribe(gid, chat => setChatKeeper([chat]))
        );
    }, [gid]);

    return chatKeeper as [Chat | Nullish];
}
