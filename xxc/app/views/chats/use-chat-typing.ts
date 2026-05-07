import {useEffect, useState} from 'react';
import {subscribeChatTyping} from '~/app/core/im/im-chat-typing';

/**
 * 会话输入中状态 Hook
 * @param cgid 会话 gid
 * @returns 当前会话对方是否在输入中
 */
export default function useChatTyping(cgid: string): boolean {
    const [typing, setTyping] = useState(false);

    useEffect(() => {
        if (!/\d+&\d+/.test(cgid)) {
            return;
        }

        const subscription = subscribeChatTyping(cgid, setTyping);
        return () => subscription.unsubscribe();
    }, [cgid]);

    return typing;
}
