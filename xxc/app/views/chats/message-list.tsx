import {type MouseEvent, memo, useCallback} from 'react';
import ErrorBoundary from '~/app/components/error-boundary';
import {showContextMenu} from '~/app/core/context-menu';
import {showContextMenuWithItems} from '~/app/core/context-menu-independent';
import {sortChatMessages} from '~/app/core/im/chat-message';
import {ChatMessagesStoreModule} from '~/app/entries/vars/ChatMessagesStoreModule';
import {getContextMenuItems} from '~/app/entries/vars/getContextMenuItems';
import {classes} from '~/app/utils/html-helper';
import ChatMessageListItem from './chat-message-list-item';
import MessageListItem from './message-list-item';

const {default: chatMessagesStore} = ChatMessagesStoreModule;

type MessageListProps = {
    messagesOrIndexes: number[] | ChatMessage[];
    cgid?: string;
    needResort?: boolean;
    reverse?: boolean;
    listItemProps?: Record<string, any>;
    header?: React.JSX.Element | (() => React.JSX.Element) | null;
    footer?: React.JSX.Element | (() => React.JSX.Element) | null;
    className?: string;
    listRef?: React.RefObject<HTMLDivElement>;
    bubbleContextMenu?: boolean | ((event: MouseEvent<HTMLDivElement>, messageID: number) => void);
    unreadMessageIndexes?: Set<number> | null;
    fromHistory?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * MessageList 组件 ，显示MessageList界面
 * @param props React 组件属性对象
 * @param props.messagesOrIndexes 消息 Index 列表或消息对象列表，此列表必须为从旧到新的顺序排列（最后的消息必须为最新的消息），如果不是按此顺序排列，请将 `needResort` 属性设置为 true
 * @param props.cgid 消息所属会话 GID
 * @param props.needResort 是否对 messagesOrIndexes 进行排序
 * @param props.reverse 是否对 messagesOrIndexes 进行逆序操作
 * @param props.listItemProps 列表项属性
 * @param props.header 头部内容
 * @param props.className 类名
 * @param props.bubbleContextMenu 消息气泡上的右键菜单，如果为 true，则显示默认菜单，也可以通过一个函数来自定义处理
 * @returns JSX.Element
 */
function MessageList(props: MessageListProps) {
    const {
        messagesOrIndexes,
        cgid,
        needResort = false,
        reverse = false,
        listItemProps,
        header,
        footer,
        className,
        listRef,
        bubbleContextMenu,
        unreadMessageIndexes,
        fromHistory = true,
        ...others
    } = props;

    /**
     * 默认的消息气泡上下文菜单事件处理函数
     */
    const defaultBubbleContextMenuHandler = useCallback<(event: MouseEvent<HTMLDivElement>, messageID: number) => void>(
        (event, messageID) => {
            const message = chatMessagesStore.getMessage(messageID);
            if (!message) {
                return;
            }

            if (message.isInLocal) {
                return;
            }

            if (!fromHistory) {
                showContextMenu('message', {
                    event,
                    message,
                    options: {
                        copySelect: 'first',
                        linkTarget: true,
                    },
                });
            } else {
                const options = {
                    event,
                    message,
                    options: {
                        copySelect: 'first',
                        linkTarget: true,
                    },
                };
                let menuItems = getContextMenuItems('message', options);
                menuItems = menuItems.filter(
                    (item) => !['message-retract', 'message-pin', 'message-unpin'].includes(item.id),
                );
                showContextMenuWithItems('message', menuItems, options);
            }
        },
        [fromHistory],
    );

    /**
     * 处理右键上下文菜单事件
     */
    const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = useCallback(
        (event) => {
            if (!bubbleContextMenu || event.target.tagName === 'WEBVIEW') {
                return;
            }

            const bubbleElement = event.target.closest('.app-message-bubble');
            if (!bubbleElement) {
                return;
            }
            const messageID = bubbleElement.getAttribute('data-id');
            if (!messageID) {
                return;
            }
            if (typeof bubbleContextMenu === 'function') {
                bubbleContextMenu(event, +messageID);
            } else {
                defaultBubbleContextMenuHandler(event, +messageID);
            }
        },
        [bubbleContextMenu, defaultBubbleContextMenuHandler],
    );

    let messagesView = null;
    if (messagesOrIndexes.length) {
        let list = messagesOrIndexes.slice();
        // 处理列表项类型为数字的情况
        if (isNumberArray(list)) {
            list = needResort ? list.sort((x, y) => x - y) : list;
            if (reverse && list[0] < list[list.length - 1]) {
                list = list.reverse();
            }
            list = list.filter(Boolean);

            messagesView = (
                <IndexList
                    unreadMessageIndexes={unreadMessageIndexes}
                    list={list}
                    listItemProps={listItemProps}
                    cgid={cgid}
                />
            );
        } else {
            list = needResort ? sortChatMessages(list) : list;
            if (reverse && list[0] < list[list.length - 1]) {
                list = list.reverse();
            }
            list = list.filter(Boolean);

            messagesView = (
                <ObjectList unreadMessageIndexes={unreadMessageIndexes} list={list} listItemProps={listItemProps} />
            );
        }
    }

    const headerView = typeof header === 'function' ? header() : header;
    const footerView = typeof footer === 'function' ? footer() : footer;

    return (
        <ErrorBoundary>
            <div
                className={classes('app-message-list', className)}
                onContextMenu={bubbleContextMenu ? handleContextMenu : undefined}
                ref={listRef}
                {...others}
            >
                {headerView}
                {messagesView}
                {footerView}
            </div>
        </ErrorBoundary>
    );
}

function IndexList(props: {
    unreadMessageIndexes?: Set<number> | null;
    list: number[];
    listItemProps: Record<string, any>;
    cgid: string;
}) {
    const {unreadMessageIndexes, list, listItemProps, cgid} = props;

    return (
        <div>
            {list.map((item, i) => {
                const itemProps = typeof listItemProps === 'function' ? listItemProps(item) : listItemProps;
                const unread = unreadMessageIndexes?.has(chatMessagesStore.getMessage(item, cgid, 'index')?.index);
                return (
                    <ChatMessageListItem
                        cgid={cgid}
                        key={item}
                        messageIndex={item}
                        prevMessageIndex={list[i - 1]}
                        unread={unread}
                        {...itemProps}
                    />
                );
            })}
        </div>
    );
}

function ObjectList(props: {
    unreadMessageIndexes?: Set<number> | null;
    list: ChatMessage[];
    listItemProps: Record<string, any>;
}) {
    const {unreadMessageIndexes, list, listItemProps} = props;

    return (
        <div>
            {list.map((item, i) => {
                const itemProps = typeof listItemProps === 'function' ? listItemProps(item) : listItemProps;
                const unread = unreadMessageIndexes?.has(item.index);
                return (
                    <MessageListItem
                        prevMessage={list[i - 1]}
                        key={item.gid}
                        message={item}
                        unread={unread}
                        {...itemProps}
                    />
                );
            })}
        </div>
    );
}

function isNumberArray(value: number[] | ChatMessage[]): value is number[] {
    return typeof value[0] === 'number';
}

export default memo(MessageList);
