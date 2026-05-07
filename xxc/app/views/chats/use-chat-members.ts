import {useState, useEffect} from 'react';
import {isSameSet} from '../../utils/set-helper';
import chatsStore from '../../core/im/chats-store';

/**
 * 获取会话成员 ID 集合
 * @param gid 会话 GID
 * @returns 会话成员 ID 集合
 */
function getChatMembers(gid: string): Set<number> {
    const chat = chatsStore.getChat(gid);
    return chat ? chat.members : new Set();
}

/**
 * 会话成员 Hook
 * @param gid 会话 GID
 * @returns 会话成员 ID 列表
 */
export default function useChatMembers(gid: string): number[] {
    const [membersSet, setMembersSet] = useState(() => getChatMembers(gid));

    useEffect(() => {
        function updateChatMembers() {
            const members = getChatMembers(gid);
            if (!isSameSet(members, membersSet)) {
                setMembersSet(new Set(members));
            }
        }
        updateChatMembers();
        return chatsStore.unsubscribe.bind(
            chatsStore,
            chatsStore.subscribe(gid, updateChatMembers)
        );
    }, [gid, membersSet]);

    return [...membersSet];
}
