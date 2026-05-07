import {useState, useEffect} from 'react';
import events from '../../core/events';
import {onActiveChat, getActiveChatGid} from '../../core/im/chat-active-state';

/**
 * 当前激活的会话 Hook
 * @returns 当前激活的会话 GID
 */
export default function useActiveChat(): string {
    const [activeChatGid, setActiveChatGid] = useState(getActiveChatGid);

    useEffect(() => events.off.bind(
        events,
        onActiveChat(setActiveChatGid)
    ), []);

    return activeChatGid;
}
