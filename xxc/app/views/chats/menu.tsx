import {useState, useEffect, useRef} from 'react';
import {getCurrentUser, onUserLogin} from '~/app/core/profile';
import {showCreateChatDialog} from './chat-create-dialog';
import Icon from '~/app/components/icon';
import Button from '~/app/components/button';
import {classes} from '~/app/utils/html-helper';
import MenuList from './menu-list';
import SearchControl, {type SearchControlRef } from '~/app/components/search-control';
import {showContextMenu} from '~/app/core/context-menu';
import type {ChatMenuType} from '~/app/constants';
import useLang from '../common/use-lang';

type MenuProps = Partial<{
    className: string;
    filterType: ValueOf<typeof ChatMenuType>;
    children: React.ReactNode;
    activeChatId: string;
}>;

/**
 * Menu 组件 ，显示聊天列表界面
 */
export default function Menu(props: MenuProps) {
    const {filterType, className, children, activeChatId, ...other} = props;
    const [search, setSearch] = useState('');
    const [searchFocus, setSearchFocus] = useState(false);
    const searchControlRef = useRef<SearchControlRef>();
    const blurSearchTimerRef = useRef<NodeJS.Timeout>();
    const hasSearch = searchFocus && typeof search === 'string' && search.length;
    const [Lang] = useLang();

    /**
     * 处理列表类型按钮点击事件
     * @param e 事件对象
     */
    const handleMenuTypeBtnClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        let triggerElement = e.target as HTMLElement;
        while (triggerElement && (!triggerElement.classList || !triggerElement.classList.contains('btn'))) {
            triggerElement = triggerElement.parentElement;
        }
        showContextMenu('chats.menu', {
            event: e,
            activeChatId,
            filterType,
            options: {
                preventDefault: true,
                stopPropagation: true,
                position: {
                    direction: 'below-left',
                    triggerElement,
                }
            }
        });
    };

    /**
     * 处理创建会话按钮点击事件
     * @param event 事件对象
     */
    const handleCreateChatBtnClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        if(filterType !== 'groups') {
            showCreateChatDialog();
            return;
        }

        showContextMenu('menu.add', {event, filterType});
    };

    /**
     * 处理搜索文本变更事件
     * @param search 搜索文本
     */
    const handleSearchChange = (value: string) => {
        setSearch(value);
    };

    /**
     * 处理清除搜索框内容事件
     */
    const onClearSearch = () => {
        searchControlRef.current.handleOnClearBtnClick(false);
    };

    /**
     * 处理搜索框获得焦点事件
     * @param focus 搜索框是否获得焦点
     */
    const handleSearchFocusChange = (focus: boolean) => {
        if (blurSearchTimerRef.current) {
            clearTimeout(blurSearchTimerRef.current);
        }
        if (focus) {
            setSearchFocus(focus);
        } else {
            blurSearchTimerRef.current = setTimeout(() => {
                setSearchFocus(false);
                blurSearchTimerRef.current = null;
                onClearSearch();
            }, 200);
        }
    };

    return (
        <div className={classes('app-chats-menu single column', className)} {...other}>
            <div className="app-chats-menu-search -flex -justify-around">
                <SearchControl
                    ref={searchControlRef}
                    hotkeyScope="chatsMenuSearch"
                    onFocusChange={handleSearchFocusChange}
                    className="app-chats-search "
                    onSearchChange={handleSearchChange}
                    placeholder={Lang.string('common.search')}
                    name="chatsMenuSearchInput"
                    changeDelay={500}
                />
            </div>
            <div className="-flex app-chats-menu-header">
                <Button className="-rounded app-chats-menu-type-btn" label={Lang.string(`chat.menu.${filterType}`)} onClick={handleMenuTypeBtnClick}>
                    <Icon name="chevron-down" />
                </Button>
                <Button className="primary x-outline -rounded-full btn-sm app-chats-menu-create-btn !-min-w-fit" onClick={handleCreateChatBtnClick}>
                    <Icon name="mdi-plus"/>
                </Button>
            </div>
            <MenuList
                id="appChatsMenuList"
                search={hasSearch ? search : undefined}
                filter={filterType}
                activeChatId={activeChatId}
                className="-flex-auto"
            />
            {children}
        </div>
    );
}
