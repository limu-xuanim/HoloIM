import {memo, useMemo} from 'react';
import {classes} from '~/app/utils/html-helper';
import Icon from '~/app/components/icon';
import ChatTitle from './chat-title';
import {getMenuItemsForContext} from '~/app/core/context-menu';
import Config from '~/app/config';
import useUserConfig from '../common/use-user-config';
import useChat from './use-chat';
import platform from '~/app/platform';
import ContextMenu from '~/app/components/context-menu';
import {showChatsHistoryWindow} from '~/app/entries/chathistory/open-window';
import {getAllUserConfig} from '~/app/core/profile';
import useLang from '~/app/views/common/use-lang';

const handleTitlebarDblClick = platform.env.isOSX ? () => platform.call<void>('ui.handleTitlebarDblClick') : undefined;

type MenuItem = {
        id: string;
        label: string;
        icon: string;
    }
    & Partial<{
        url: string;
        disabled: boolean;
        order: number;
        className: string;
        click: React.MouseEventHandler<HTMLButtonElement>;
        hintPosition: string;
    }>;

const createButtonFromMenuItem = (item: MenuItem) => {
    const itemView = <Icon name={item.icon} />;
    const itemClassName = classes('app-chat-header-toolbar-item btn iconbutton -rounded hint--bottom-right', item.className);
    return item.url ? (
        <a
            key={item.id}
            data-id={item.id}
            className={itemClassName}
            data-hint={item.label}
            href={item.url}
        >
            {itemView}
        </a>
    ) : (
        <button
            key={item.id}
            data-id={item.id}
            className={itemClassName}
            data-hint={item.label}
            onClick={item.click}
            type="button"
        >
            {itemView}
        </button>
    );
};

type ChatHeaderProps = {cgid: string;}
    & Partial<{
        className: string;
        forceHideSidebar: boolean;
    }>;

/**
 * 会话标题组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @param props.cgid 会话 GID
 * @param props.className 类名
 * @returns React Node content
 */
function ChatHeader(props: ChatHeaderProps) {
    const {cgid, className, forceHideSidebar = false} = props;

    const [Lang, langName] = useLang();
    const [chat] = useChat(cgid);
    const showSidebarIcon = useUserConfig(`temp.ui.chat.showSidebar.${cgid}`);
    const simpleChatView = Config.ui['chat.simpleChatView'];

    const menuItems = useMemo(() => {
        if (simpleChatView) return [];
        const items: MenuItem[] = [];
        const moreItems = getMenuItemsForContext('chat.toolbar.more', {chat});

        if (moreItems?.length) {
            items.push({
                id: 'chat-more',
                icon: 'sprite-more',
                label: Lang.string('common.more'),
                click: e => {
                    ContextMenu.show({x: e.pageX, y: e.pageY, direction: 'bottom-left'}, moreItems);
                }
            });
        }

        if (!Config.ui['chat.disableChatHistory']) {
            items.push({
                id: 'chat-history',
                icon: 'sprite-chat-history',
                label: Lang.string('chat.toolbar.history'),
                click: () => {
                    showChatsHistoryWindow(chat.gid);
                }
            });
        }

        // 这里使用跟ChatView里的siderbar同样的判断方式，保持数据一致性
        if (!forceHideSidebar) {
            items.push({
                id: 'chat-sidebar',
                icon: 'sprite-sidebar',
                label: showSidebarIcon ? Lang.string('chat.sidebar.close') : Lang.string('chat.toolbar.sidebar'),
                click: () => {
                    getAllUserConfig()?.setChatSidebarShow(chat.gid, !showSidebarIcon);
                }
            });
        }

        if (items.length) {
            items[items.length - 1].hintPosition = 'bottom-left';
        }
        return items;
    }, [chat, chat?.star, chat?.mute, chat?.isDeleted, chat?.isDismissed, forceHideSidebar, showSidebarIcon, langName, simpleChatView]);

    return (
        <div className={classes('app-chat-header -flex -flex-wrap -justify-between user-app-dragable divider', className)} onDoubleClick={handleTitlebarDblClick}>
            <ChatTitle cgid={cgid} className="-flex -items-center" />
            {
                simpleChatView
                    ? null
                    : (
                        <div className="toolbar -flex -items-center -rounded">
                            {menuItems.map(createButtonFromMenuItem)}
                        </div>
                    )
            }
        </div>
    );
}

export default memo(ChatHeader);
