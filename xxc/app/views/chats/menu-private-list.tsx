import {useCallback, useEffect, useRef, useState} from 'react';
import MenuChatList, {type MenuChatListProps} from './menu-chat-list';
import chatsStore from '../../core/im/chats-store';
import {isNotEmptyArray} from '~/app/utils/check-empty';

/**
 * MenuPrivate 组件 ，显示私人会话
 */
export default function MenuPrivate(props: Omit<MenuChatListProps, 'chats'>) {
    const [chats, setChats] = useState<Chat[]>();
    const loadedRef = useRef(false);

    /**
    * 根据关键字加载关联的会话
    */
    const loadChats = useCallback(() => {
        setChats(chatsStore.getPrivateChats());
    }, []);

    useEffect(() => {
        if (isNotEmptyArray(chats)) {
            loadedRef.current = true;
        }
    }, [chats])

    useEffect(() => {
        const dataChangeHandler = chatsStore.subscribeAny((chats: Chat[]) => {
            if (chats.some(x => x.isOne2One)) {
                loadChats();
            }
        });
        loadChats();
        return () => {
            chatsStore.unsubscribe(dataChangeHandler);
        };
    }, [loadChats]);

    const {
        filter,
        className,
        children,
        activeChatId,
        ...other
    } = props;

    if (!chats || !chats.length) {
        return null;
    }

    return (
        <MenuChatList className={className} activeChatId={activeChatId} chats={chats} filter={filter} {...other}>
            {children}
        </MenuChatList>
    );
}
