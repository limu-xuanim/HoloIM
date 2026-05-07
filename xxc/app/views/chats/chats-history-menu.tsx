import {memo, type MouseEventHandler, useCallback, useState} from 'react';
import {classes} from '~/app/utils/html-helper';
import Avatar from '~/app/components/avatar';
import useLang from '../common/use-lang';
import ChatListItem from './chat-list-item';
import {chatsStore} from '~/app/entries/vars/chatsStore';

const getChats = (group: string) => {
    switch (group) {
        case 'groups':
            return chatsStore.getGroupsChats();
        case 'contacts':
            return chatsStore.getPrivateChats();
        default:
            return [];
    }
}

type ChatsHistoryMenuProp = Partial<{
    className: string;
    searchResultMap: Map<string, number> | null;
    searchTypeFilter: string;
    selectedChat: string;
    onSelectChat: (chat: string) => void;
}>;

/**
 * 消息记录会话菜单
 * @param props React 组件属性对象
 * @param props.className        类名
 * @param props.searchResultMap  搜索结果记录
 * @param props.searchTypeFilter 搜索过滤类型
 * @param props.selectedChat     当前选中的会话 GID
 * @param props.onSelectChat     当前选中的会话时的回调函数
 * @returns JSX.Element
 */
function ChatsHistoryMenu(props: ChatsHistoryMenuProp) {
    const {className, searchResultMap, searchTypeFilter, selectedChat, onSelectChat} = props;
    const [Lang] = useLang();
    const [groupsExpand, setGroupsExpand] = useState(() => {
        if (!selectedChat) {
            return {contacts: false, groups: true};
        }

        const expand = {contacts: false, groups: false};
        if (selectedChat.includes('&')) {
            expand.contacts = true;
        } else {
            expand.groups = true;
        }
        return expand;
    });

    const handleGroupHeaderClick: MouseEventHandler<HTMLAnchorElement> = useCallback((event) => {
        const element = (event.target as HTMLElement).closest<HTMLElement>('[data-group]');
        if (element) {
            const group = element.dataset.group as 'contacts' | 'groups';
            setGroupsExpand({...groupsExpand, [group]: !groupsExpand[group]});
        }
    }, [groupsExpand]);

    const handleListItemClick: MouseEventHandler<HTMLDivElement> = useCallback((event) => {
        const element = (event.target as HTMLElement).closest<HTMLElement>('.app-chat-item');
        if (element && onSelectChat) {
            onSelectChat(element.dataset.gid!);
        }
    }, [onSelectChat]);

    const isGroupsOrContacts = searchTypeFilter === 'groups' || searchTypeFilter === 'contacts';
    const hasSearchResultMap = searchResultMap instanceof Map && searchResultMap.size > 0;

    return (
        <div className={classes('app-chats-history-menu primary-pale -overflow-y-auto', className)}>
            {(['groups', 'contacts'] as const).map(group => {
                if (hasSearchResultMap && isGroupsOrContacts && searchTypeFilter !== group) {
                    return null;
                }
                const isExpanded = (hasSearchResultMap && searchTypeFilter === '') ? true : groupsExpand[group];
                const listViews: JSX.Element[] = [];
                const chats = getChats(group);
                if (isExpanded) {
                    for (const chat of chats) {
                        const {gid: cgid} = chat;
                        if ((!searchTypeFilter || isGroupsOrContacts) && hasSearchResultMap && !searchResultMap.has(cgid)) {
                            continue;
                        }
                        const isSelected = cgid === selectedChat;
                        const searchResultCount = hasSearchResultMap && searchResultMap.has(cgid) ? searchResultMap.get(cgid)! : 0;
                        const badgeView = searchResultCount
                            ? <div className="label accent -rounded-full">{searchResultCount}</div>
                            : null;
                        listViews.push(
                            <ChatListItem
                                data-gid={cgid}
                                key={cgid}
                                badge={badgeView}
                                className={isSelected ? 'item active' : 'item'}
                                gid={cgid}
                            />
                        );
                    }
                    if (!searchTypeFilter && !listViews.length) { // 仅当展开时，根据搜索类型和该类型结果数量判断是否应该不渲染
                        return null;
                    }
                }

                return (
                    <div key={group} className="app-chats-history-menu-group">
                        <a className="heading" data-group={group} onClick={handleGroupHeaderClick}>
                            <Avatar className="x-text-ellipsis" icon={isExpanded ? 'menu-down' : 'menu-right'} />
                            <div className="x-text-ellipsis">{Lang.string(`chats.history.group.${group}`)}{listViews.length ? ` (${listViews.length})` : ''}</div>
                        </a>
                        {Boolean(listViews.length) && (
                            <div
                                className="app-chats-history-menu-list list compact"
                                onClick={handleListItemClick}
                            >
                                {listViews}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default memo(ChatsHistoryMenu);
