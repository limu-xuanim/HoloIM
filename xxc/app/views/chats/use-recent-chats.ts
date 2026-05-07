import {useState, useEffect} from 'react';
import chatsStore from '../../core/im/chats-store';

/**
 * 获取最近会话 GID 列表
 * @returns 最近会话 GID 列表
 */
const getRecentChatGidList = (): string => chatsStore.getRecentChats({maxRecentTime: 0}).map(x => x.gid).join(',');

/**
 * 最近会话 Hook
 * @returns 最近会话 GID 列表
 */
export default function useRecentChats(): string[] {
    const [chatsGIDList, setChatsGIDList] = useState(getRecentChatGidList);

    useEffect(() => chatsStore.unsubscribe.bind(
        chatsStore,
        chatsStore.subscribeAny(() => setChatsGIDList(getRecentChatGidList()))
    ), []);

    return chatsGIDList.split(',').filter(x => x.length);
}
