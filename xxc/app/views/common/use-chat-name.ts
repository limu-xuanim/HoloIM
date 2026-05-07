import {useState, useEffect} from 'react';
import {chatsStore} from '~/app/entries/vars/chatsStore';

/**
 * 成员名称 Hook
 * @param cgid chat gid
 * @returns 成员名称
 */
export default function useChatName(cgid: string): string {
    const [name, setName] = useState('');

    useEffect(() => {
        const chat = chatsStore.getChat(cgid, false, true);
        if (chat) {
            setName(chat.name);
        }
        return chatsStore.unsubscribe.bind(
            chatsStore,
            chatsStore.subscribe(cgid, c => {
                setName(c.name);
            })
        );
    }, [cgid]);

    return name;
}
