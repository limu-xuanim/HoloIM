import {classes} from '~/app/utils/html-helper';
import ScrollList, {type ScrollListProps} from '~/app/components/scroll-list';
import MenuRecentList from './menu-recent-list';
import MenuPrivateList from './menu-private-list';
import MenuSearchList from './menu-search-list';
import {ChatMenuType} from '~/app/constants';
import {useCallback, useEffect, useState} from 'react';
import MenuChatList, {type MenuChatListProps} from './menu-chat-list';
import chatsStore from '~/app/core/im/chats-store';

function MenuGroupsList(props: Omit<MenuChatListProps, 'chats'>) {
    const [chats, setChats] = useState<Chat[]>();
    const loadChats = useCallback(() => {
        setChats(chatsStore.getGroupsChats());
    }, []);

    useEffect(() => {
        const dataChangeHandler = chatsStore.subscribeAny((changedChats: Chat[]) => {
            if (changedChats.some(x => x.isGroup || x.isSystem)) {
                loadChats();
            }
        });
        loadChats();
        return () => {
            chatsStore.unsubscribe(dataChangeHandler);
        };
    }, [loadChats]);

    if (!chats?.length) {
        return null;
    }

    return <MenuChatList {...props} chats={chats} />;
}

type MenuListProps = Partial<{
    search: string;
    filter: ValueOf<typeof ChatMenuType>;
    activeChatId: string;
}> & ScrollListProps;

/**
 * MenuList 组件 ，显示聊天列表界面
 */
export default function MenuList(props: MenuListProps) {
    const {
        search,
        filter = ChatMenuType.recents,
        className,
        activeChatId,
        ...other
    } = props;

    let menuContent = null;
    if (search) {
        menuContent = <MenuSearchList search={search} activeChatId={activeChatId} />;
    } else {
        switch (filter) {
            case ChatMenuType.groups:
                menuContent = <MenuGroupsList filter={filter} activeChatId={activeChatId} />;
                break;
            case ChatMenuType.private:
                menuContent = <MenuPrivateList filter={filter} activeChatId={activeChatId} />;
                break;
            default:
                menuContent = <MenuRecentList filter={ChatMenuType.recents} activeChatId={activeChatId} />;
        }
    }

    return (
        <ScrollList
            className={classes('app-menu-list', className)}
            data-menu-type={filter}
            {...other}
        >
            {menuContent}
        </ScrollList>
    );
}
