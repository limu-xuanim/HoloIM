import {memo, useEffect} from 'react';
import {classes, scrollIntoView} from '~/app/utils/html-helper';
import MenuChatListItem from './menu-chat-list-item';
import type {MenuChatListItemProps} from './menu-chat-list-item';
import {getActiveChatGid} from '~/app/core/im/chat-active-state';
import {showContextMenu} from '~/app/core/context-menu';
import Config from '~/app/config';
import {isRoutePathMatch, parseRoutePath} from '~/app/core/ui/router';
import {sendContentToChat} from '~/app/core/im/im-ui';
import chatsStore from '~/app/core/im/chats-store';
import chatMessagesListStore from '~/app/core/im/chat-messages-list-store';
import type {ChatMenuType} from '~/app/constants';

/**
 * 最近聊天列表加载时为前20个会话预加载更多消息
 */
async function loadMoreMessagesWhenInit() {
    if (!chatsStore.isReady) {
        return;
    }
    const mostRecentChats = chatsStore.getRecentChats({maxRecentTime: 0}).slice(0, 20).map(chat => chat.gid);
    for (const cgid of mostRecentChats) {
        chatMessagesListStore.loadMoreList(cgid, 10);
    }
}

/**
 * 处理右键菜单事件
 * @param event 事件对象
 */
function handleContextMenuOfChatItem(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const item = (event.target as HTMLDivElement).closest('.app-menu-chat-item');
    const menu = item.closest('.app-menu-list');
    const menuType = menu.getAttribute('data-menu-type');
    showContextMenu('chat.menu', {
        event,
        chat: item.getAttribute('data-gid'),
        menuType,
        viewType: ''
    });
}

/**
 * 处理点击菜单事件
 * @param event 事件对象
 */
function handleClickOfChatItem(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const item = (event.target as HTMLDivElement).closest('.app-menu-chat-item');
    if (item?.classList.contains('active')) {
        sendContentToChat('', {cgid: item.getAttribute('data-gid')});
    }
}

export type MenuChatListProps = {chats: Chat[];}
    & React.HTMLAttributes<HTMLDivElement>
    & Partial<{
        filter: ValueOf<typeof ChatMenuType>;
        activeChatId: string;
        listItemProps: Partial<MenuChatListItemProps>;
    }>;

/**
 * 会话菜单组件
 * @param props React 组件属性对象
 * @param props.chats 会话列表
 * @param props.className 类名
 * @param props.filter 列表类型
 * @param props.listItemProps 列表项属性
 * @param props.activeChatId 当前激活的会话 GID
 * @returns React Node content
 */
function MenuChatList(props: MenuChatListProps) {
    const {
        chats,
        className,
        filter,
        listItemProps,
        activeChatId,
        children,
        ...others
    } = props;

    const activeChatGID = activeChatId || getActiveChatGid();

    useEffect(() => {
        if (!Config.ui['chat.autoScrollToActiveChat']) {
            return;
        }

        const {autoScrollBehavior = ''} = parseRoutePath().params;
        const behaviorSet = new Set(autoScrollBehavior.split(','));
        if (isRoutePathMatch('chats', '*', activeChatGID)) {
            scrollIntoView(document.getElementById(`menuChatListItem-${activeChatGID}`), {
                behavior: behaviorSet.has('smooth') ? 'smooth' : 'instant',
                block: behaviorSet.has('end') ? 'end' : behaviorSet.has('center') ? 'center' : behaviorSet.has('start') ? 'start' : 'nearest',
                ifNeed: !behaviorSet.has('always')
            });
        }

        // 已经激活的会话中，消息发生变动会改变左侧列表中会话位置，滚动一下，使激活的会话保持可见
        const subscriptionID = chatsStore.subscribe(activeChatGID, () => {
            if (isRoutePathMatch('chats', '*', activeChatGID)) {
                scrollIntoView(document.getElementById(`menuChatListItem-${activeChatGID}`), {
                    block: 'center',
                });
            }
        });
        return () => {
            chatsStore.unsubscribe(subscriptionID);
        };
    }, [activeChatGID]);

    useEffect(() => chatsStore.unsubscribeChatsReadyEvent.bind(chatsStore, chatsStore.subscribeChatsReadyEvent(loadMoreMessagesWhenInit)));

    return (
        <div
            className={classes('app-chats-menu-list list', className)}
            onContextMenu={handleContextMenuOfChatItem}
            onClick={handleClickOfChatItem}
            {...others}
        >
            {
                chats.map(chat => {
                    if (!chat) {
                        if (DEBUG) {
                            console.error('Cannot render chat-list-item, because chat is empty', chat)
                        }
                        return null;
                    }
                    const gid = typeof chat === 'object' ? chat.gid : chat;
                    const isActive = activeChatGID === gid;
                    return (
                        <MenuChatListItem
                            filter={filter}
                            data-gid={gid}
                            id={`menuChatListItem-${gid}`}
                            key={gid}
                            gid={gid}
                            className={classes('item', {active: isActive})}
                            {...listItemProps}
                        />
                    );
                })
            }
            {children}
        </div>
    );
}

export default memo(MenuChatList);
