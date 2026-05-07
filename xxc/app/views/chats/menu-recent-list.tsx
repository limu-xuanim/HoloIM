import {memo, useEffect, useState, useRef, type ReactNode} from 'react';
import chatsStore from '../../core/im/chats-store';
import fuid from '../../utils/fuid';
import MenuChatList from './menu-chat-list';
import useRecentChats from './use-recent-chats';
import type {ChatMenuType} from '~/app/constants';

type MenuRecentListProps = {
    className?: string,
    activeChatId: string,
    filter: ValueOf<typeof ChatMenuType>,
    children?: ReactNode,
}

/**
 * 最近会话列表组件
 * @param props React 组件属性对象
 * @param props.activeChatId 当前激活的会话 GID
 * @param props.filter 列表类型
 * @param props.className 类名
 * @param props.children 子节点
 * @returns JSX.Element
 */
function MenuRecentList(props: MenuRecentListProps) {
    const {
        filter,
        activeChatId,
        className,
        children,
    } = props;
    const idRef = useRef(`menu-recent-${fuid()}-end`);
    const chats = useRecentChats();
    const [showSize, setShowSize] = useState(10); // 刚开始显示 10 个会话
    const chatsLength = chats?.length;

    useEffect(() => {
        if (!chatsLength) {
            return;
        }
        let intersectionObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                if (showSize < chatsLength) {
                    setShowSize((state) => Math.min(chatsLength, state + 5)); // 每次滚动显示 5 个会话
                } else {
                    intersectionObserver.disconnect();
                    intersectionObserver = null;
                }
            }
        });

        intersectionObserver.observe(document.getElementById(idRef.current));

        return () => intersectionObserver?.disconnect();
    }, [showSize, chatsLength]);

    // TODO(catouse): 定期缩小 showSize 来清除没有在界面上看到的列表项

    if (!chatsLength) {
        return null;
    }

    const activeIndex = activeChatId ? chats.indexOf(activeChatId) : -1;
    const maxIndex = Math.max(activeIndex + 10, showSize - 1);
    const chatsShown = chats.reduce((shownChats, cgid, index) => {
        if (index <= maxIndex || chatsStore.getChat(cgid)?.unreadMessagesCount) {
            shownChats.push(cgid);
        }
        return shownChats;
    }, []);

    if (activeIndex < 0) {
        const activeChat = chatsStore.getChat(activeChatId);
        if (activeChat && !activeChat.isSystem) {
            chatsShown.unshift(activeChatId);
        }
    }

    return (
        <MenuChatList
            className={className}
            activeChatId={activeChatId}
            chats={chatsShown}
            filter={filter}
            listItemProps={{hideOnLoading: true}}
        >
            {children}
            <div id={idRef.current} style={{height: 1}} />
        </MenuChatList>
    );
}

export default memo(MenuRecentList);
