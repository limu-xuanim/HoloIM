import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {classes} from '~/app/utils/html-helper';
import Spinner from '~/app/components/spinner';
import {setChatCacheState, takeOutChatCacheState} from '~/app/core/im/im-ui';
import Button from '~/app/components/button';
import ScrollList from '~/app/components/scroll-list';
import chatsStore from '~/app/core/im/chats-store';
import useLang from '../common/use-lang';
import useUserConfig from '../common/use-user-config';
import useChat from './use-chat';
import useChatMessagesList from './use-chat-messages-list';
import chatMessagesListStore from '~/app/core/im/chat-messages-list-store';
import MessageList from './message-list';
import type {ScrollInfo, ScrollListClassicRef} from '~/app/components/scroll-list-classic';
import type {ScrollListCustomRef} from '~/app/components/scroll-list-custom';
import Icon from '~/app/components/icon';
import {highlightMessageIdAtom} from '~/app/jotai/atoms/highlight-message';
import {useSetAtom} from 'jotai';
import useChatMessagesByIndice from './use-chat-messages-by-indice';
import useCurrentUser from '../common/use-current-user';
import useActiveChat from './use-active-chat';

type ChatMessagesProps = {
    gid: string;
    className?: string;
};

/**
 * 会话消息列表组件
 * @param props React 组件属性对象
 * @returns JSX.Element
 */
function ChatMessages(props: ChatMessagesProps) {
    const {gid, className} = props;
    const [chat] = useChat(gid) as [Chat];
    const {list: indexList = [], loading, canLoadMore} = useChatMessagesList(gid);
    const [Lang, langName] = useLang();
    // 在显示时，尝试从状态缓存中获取滚动位置信息，并滚动到指定的位置
    const [topDate, setTopDate] = useState<string>('');
    const listScrollTop = takeOutChatCacheState(gid, 'scrollPos');
    const [isStickiedAtBegin, setIsStickiedAtBegin] = useState(!listScrollTop); // 滚动区域是否在开始位置
    const scrollListRef = useRef<ScrollListClassicRef | ScrollListCustomRef>(null);
    const messageListRef = useRef<HTMLDivElement>(null);
    const topDateDividerRef = useRef<HTMLDivElement | null>(null);
    const {unreadMessagesCount, unreadMessageIndexes, fileSavedNoticeCount, lastReadMessageIndex, lastMessageInfo} = chat;
    const fontSize = useUserConfig('ui.chat.fontSize');
    const [firstUnreadMessageStatus, setFirstUnreadMessageStatus] = useState<'show' | 'top' | 'bottom'>('show');
    const setHighlightMessageId = useSetAtom(highlightMessageIdAtom);
    const chatMessageList = useChatMessagesByIndice(indexList.concat(chat.localMessagesList), gid);
    const [user] = useCurrentUser();
    const activeChatGid = useActiveChat();

    // unreadMessagesInList 用于记录向下按钮上提示的未读消息数目，当用户收到新的消息激活会话之后 chat.unreadMessagesCount 会重置为 0，但此时消息列表可能不是处于底部，所以向下滚动按钮上的未读消息数仍然会显示
    const [tmpUnreadMessageIndexes, setTmpUnreadMessageIndexes] = useState(new Set(unreadMessageIndexes));
    const lastReadMessageIndexRef = useRef(lastReadMessageIndex);

    /**
     * 检查当前可见范围内最顶部消息的日期
     */
    const checkTopDate = useCallback(() => {
        if (!messageListRef.current || !scrollListRef.current) {
            return;
        }

        const dateDividers = messageListRef.current.querySelectorAll<HTMLDivElement>('.app-message-divider');
        const listElementTop = (scrollListRef.current as ScrollListCustomRef).listElement.getBoundingClientRect().top;
        let topDateDivider = null;
        for (let i = dateDividers.length - 1; i >= 0; --i) {
            const dateDivider = dateDividers[i];
            const dateDividerTop = dateDivider.getBoundingClientRect().top;
            if (dateDividerTop < listElementTop) {
                topDateDivider = dateDivider;
                break;
            }
        }

        if (topDateDividerRef.current === topDateDivider) {
            return;
        }

        topDateDividerRef.current = topDateDivider;
        if (topDateDivider) {
            setTopDate(topDateDivider.innerText);
        } else {
            setTopDate('');
        }
    }, []);

    /**
     * 检查第一条未读消息是否在可见范围内
     */
    const checkFirstUnreadMessageShow = useCallback(() => {
        if (tmpUnreadMessageIndexes.size === 0) {
            setFirstUnreadMessageStatus('show');
            return;
        }

        if (!messageListRef.current || !scrollListRef.current) {
            return;
        }

        const minIndex = Math.min(...tmpUnreadMessageIndexes);
        const minIndexDom = messageListRef.current.querySelector<HTMLElement>(`[data-index="message-${minIndex}"]`);
        if (!minIndexDom) {
            setFirstUnreadMessageStatus('show');
            return;
        }

        const {top: messageTop, bottom: messageBottom} = minIndexDom.getBoundingClientRect();
        const {top: listElementTop, bottom: listElementBottom} = (scrollListRef.current as ScrollListCustomRef).listElement.getBoundingClientRect();
        if (messageTop >= listElementTop && messageBottom <= listElementBottom) {
            setFirstUnreadMessageStatus('show');
        } else if (messageTop < listElementTop) {
            setFirstUnreadMessageStatus('top');
        } else {
            setFirstUnreadMessageStatus('bottom');
        }
    }, [tmpUnreadMessageIndexes]);

    /**
     * 处理滚动事件
     * @param scrollInfo 滚动信息
     */
    const handleScroll = useCallback((scrollInfo: ScrollInfo) => {
        const {isStickiedAtBegin: isAtBegin, isStickiedAtEnd, scrollbarShowed} = scrollInfo;
        setIsStickiedAtBegin(isAtBegin);

        if (canLoadMore && (isStickiedAtEnd || !scrollbarShowed)) {
            chatMessagesListStore.loadMoreList(gid);
        }

        setTimeout(() => {
            checkFirstUnreadMessageShow();
            handleReadMessages();
        }, 1000);
        checkTopDate();
    }, [canLoadMore, gid, checkTopDate, checkFirstUnreadMessageShow]);

    /**
     * 阅读所有未读消息
     */
    const handleReadMessages = useCallback(() => {
        lastReadMessageIndexRef.current = lastReadMessageIndex;
        if (unreadMessageIndexes.size === 0) {
            setTmpUnreadMessageIndexes(x => x.size === 0 ? x : new Set());
        }
    }, [lastReadMessageIndex, unreadMessageIndexes]);

    /**
     * 处理底部按钮点击事件
     * 无依赖
     */
    const handleBottomButtonClick: React.MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
        e.stopPropagation();

        if (!scrollListRef.current) {
            return;
        }

        scrollListRef.current.scrollToBegin();
        setIsStickiedAtBegin(true);
        setTimeout(() => {
            handleReadMessages();
        }, 1000);
    }, [handleReadMessages]);

    /**
     * 处理顶部日期标签按钮点击事件
     * 无依赖
     */
    const handleTopDateClick = useCallback(() => {
        if (topDateDividerRef.current) {
            (scrollListRef.current as ScrollListCustomRef)?.scrollToElement(topDateDividerRef.current, {behavior: 'smooth', block: 'start', offset: 10});
        }
    }, []);

    /**
     * 滚动到第一条未读消息
     */
    const scrollToFirstUnreadMessage: React.MouseEventHandler<HTMLAnchorElement> = useCallback((e) => {
        e.stopPropagation();

        setFirstUnreadMessageStatus('show');

        if (tmpUnreadMessageIndexes.size === 0) {
            return;
        }

        if (!messageListRef.current || !scrollListRef.current) {
            return;
        }

        const minIndex = Math.min(...tmpUnreadMessageIndexes);
        const minIndexDom = messageListRef.current.querySelector<HTMLElement>(`[data-index="message-${minIndex}"]`);
        if (!minIndexDom) {
            return;
        }

        (scrollListRef.current as ScrollListCustomRef).scrollToElement(minIndexDom, {behavior: 'smooth', block: 'center'});
        minIndexDom.classList.add('highlight-focus');
        setHighlightMessageId(minIndexDom.id);

        // 直接清空未读会导致消息列表重新渲染，无法完成滚动
        setTimeout(() => {
            handleReadMessages();
        }, 1000);
        setTimeout(() => {
            setHighlightMessageId('');
        }, 3000);
    }, [tmpUnreadMessageIndexes, handleReadMessages]);

    useEffect(() => {
        if (activeChatGid !== gid && unreadMessageIndexes.size === 0) {
            handleReadMessages();
        }
    }, [activeChatGid, unreadMessageIndexes, gid, handleReadMessages]);

    useEffect(() => {
        if (!lastMessageInfo) {
            return;
        }

        if (!user) {
            return;
        }

        // 当监听到用户发送新当消息时，立即滚动到消息列表起始位置（底部），并且尝试清理过老的消息
        if (lastMessageInfo.user === user.id && Date.now() - lastMessageInfo.date < 1000) {
            scrollListRef.current?.scrollToBegin(false);
            chatMessagesListStore.shrinkList(gid);
            handleReadMessages();
            lastReadMessageIndexRef.current = lastMessageInfo.index;
        }
    }, [gid, handleReadMessages, user, lastMessageInfo, lastMessageInfo?.index, lastMessageInfo?.user]);

    // 当消息列表显示时，如果没有出现滚动条，尝试自动加载更多
    useEffect(() => {
        const checkTimer = setTimeout(() => {
            if (!scrollListRef.current) {
                return;
            }
            if (!scrollListRef.current.scrollInfo.scrollbarShowed) {
                chatMessagesListStore.loadMoreList(gid);
            }
            checkTopDate();
        }, 1500);
        return () => {
            clearTimeout(checkTimer);
        };
    }, [gid, checkTopDate]);

    useEffect(() => () => {
        if (scrollListRef.current) {
            const {scrollInfo} = scrollListRef.current;
            if (scrollInfo && !scrollInfo.isStickiedAtBegin) {
                setChatCacheState(gid, {scrollPos: scrollInfo.position});
            }
        }
    }, [gid]);

    // 当语言切换时，重新从 DOM 读取 topDate
    // 因为日期格式依赖于语言，语言切换后 DOM 中的日期文本会更新
    useEffect(() => {
        // 使用 setTimeout 确保在 DOM 更新后再读取
        const timer = setTimeout(() => {
            // 重置 topDateDividerRef，强制重新读取，即使元素是同一个
            // 因为语言切换后，同一个元素的 innerText 已经更新了
            topDateDividerRef.current = null;
            checkTopDate();
        }, 0);
        return () => clearTimeout(timer);
    }, [langName, checkTopDate]);

    useEffect(() => {
        if (listScrollTop && scrollListRef.current) {
            scrollListRef.current.scrollTo(listScrollTop, false);
        }
    }, [listScrollTop]);

    useEffect(() => {
        setTmpUnreadMessageIndexes(x => {
            const minUnreadIndex = Math.min(...x, lastReadMessageIndexRef.current);
            let unreadMessagesInListChanged = false;
            const newUnreadMessagesInList = new Set(x);

            if (unreadMessageIndexes.size !== 0) {
                for (const index of unreadMessageIndexes) {
                    if (!newUnreadMessagesInList.has(index) && index > minUnreadIndex) {
                        newUnreadMessagesInList.add(index);
                        unreadMessagesInListChanged = true;
                    }
                }
            }

            // 如果窗口聚焦，则当前未读消息为空，需要将后续消息追加到临时未读消息中，防止黄点不连续
            for (const index of indexList) {
                if (!newUnreadMessagesInList.has(index) && index > minUnreadIndex) {
                    newUnreadMessagesInList.add(index);
                    unreadMessagesInListChanged = true;
                }
            }

            return unreadMessagesInListChanged ? newUnreadMessagesInList : x;
        });
    }, [unreadMessageIndexes, indexList]);

    useEffect(() => {
        if (!isStickiedAtBegin) {
            return;
        }

        if (unreadMessagesCount || fileSavedNoticeCount) {
            chatsStore.muteChatUnreadMessages(gid);
        }
    }, [gid, isStickiedAtBegin, unreadMessagesCount, fileSavedNoticeCount]);

    useEffect(() => {
        checkFirstUnreadMessageShow();
    }, [checkFirstUnreadMessageShow]);

    const {isMuteOrHidden} = chat;
    const stickyToBottom = true; // 是否保持在底部

    const loadingIndicatorCreator = useMemo(() => <LoadingIndicator loading={loading} canLoadMore={canLoadMore} gid={gid} />, [loading, canLoadMore, gid]);

    const topScrollButton = useMemo(() => {
        if (firstUnreadMessageStatus !== 'top') {
            return (
                <a
                    key="dateBadge"
                    onClick={handleTopDateClick}
                    className={classes('app-message-list-date-badge btn btn-sm small -rounded-full white text-gray shadow-1', topDate ? '' : 'hidden')}
                >
                    {topDate}
                </a>
            );
        }

        if (tmpUnreadMessageIndexes.size === 0) {
            return null;
        }

        return (
            <a
                key="unreadMessageBadge"
                onClick={scrollToFirstUnreadMessage}
                className="app-message-list-new-messages-scroll-top-btn btn btn-sm small -rounded-full white text-gray shadow-1 text-primary"
            ><Icon name="mdi-chevron-double-up" /><span>{Lang.format('chat.unreadMessages.scroll', tmpUnreadMessageIndexes.size)}</span></a>
        );
    }, [langName, Lang.format, tmpUnreadMessageIndexes.size, handleTopDateClick, scrollToFirstUnreadMessage, topDate, firstUnreadMessageStatus]);

    const bottomScrollButton = useMemo(() => {
        if (firstUnreadMessageStatus !== 'bottom') {
            return (
                <Button
                    key="goToTopBtn"
                    onClick={handleBottomButtonClick}
                    title={stickyToBottom ? Lang.string('chat.toolbar.scrollToBottom') : Lang.string('chat.toolbar.scrollToTop')}
                    icon={stickyToBottom ? 'arrow-down-thick' : 'arrow-up-thick'}
                    className={classes(
                        'app-message-list-scroll-btn dock-right has-margin btn-lg btn-icon -rounded-full primary-pale has-badge shadow-1 dock',
                        stickyToBottom ? 'dock-bottom' : 'dock-top',
                        isStickiedAtBegin ? 'hidden' : '-inline-block'
                    )}
                >
                    {tmpUnreadMessageIndexes.size ? <span className={classes(`label badge -rounded-full shadow ${isMuteOrHidden ? 'blue' : unreadMessagesCount ? 'red' : 'yellow'}`)}>{tmpUnreadMessageIndexes.size}</span> : null}
                </Button>
            );
        }

        if (tmpUnreadMessageIndexes.size === 0) {
            return null;
        }

        return (
            <a
                key="unreadMessageBadge"
                onClick={scrollToFirstUnreadMessage}
                className="app-message-list-new-messages-scroll-bottom-btn btn btn-sm small -rounded-full white text-gray shadow-1 text-primary"
            ><Icon name="mdi-chevron-double-down" /><span>{Lang.format('chat.unreadMessages.scroll', tmpUnreadMessageIndexes.size)}</span></a>
        );
    }, [langName, Lang.format, Lang.string, firstUnreadMessageStatus, handleBottomButtonClick, isMuteOrHidden, isStickiedAtBegin, scrollToFirstUnreadMessage, stickyToBottom, tmpUnreadMessageIndexes.size, unreadMessagesCount]);

    const scrollToBottomButtonView = [
        topScrollButton,
        bottomScrollButton
    ];

    return (
        <ScrollList
            className={classes('app-chat-messages white', className)}
            stickyToBottom={stickyToBottom}
            onScroll={handleScroll}
            ref={scrollListRef}
            customView={scrollToBottomButtonView}
            onClick={handleReadMessages}
        >
            <MessageList
                listRef={messageListRef}
                cgid={gid}
                reverse={false}
                className={classes('user-selectable', `use-font-size-${fontSize.size}`)}
                messagesOrIndexes={chatMessageList}
                header={stickyToBottom ? loadingIndicatorCreator : null}
                footer={stickyToBottom ? null : loadingIndicatorCreator}
                unreadMessageIndexes={tmpUnreadMessageIndexes}
                bubbleContextMenu
                fromHistory={false}
            />
        </ScrollList>
    );
}

export default memo(ChatMessages);

type LoadingIndicatorProps = {
    loading: boolean;
    canLoadMore: boolean;
    gid: string;
}

/**
 * 此方法用于创建加载更多提示条
 */
const LoadingIndicator = (props: LoadingIndicatorProps) => {
    const {loading, canLoadMore, gid} = props;
    const [Lang] = useLang();
    const handleLoadMoreList = useCallback(() => {
        chatMessagesListStore.loadMoreList(gid)
    }, [gid]);

    if (loading) {
        return <Spinner className="has-padding" />;
    }
    if (!canLoadMore) {
        return (
            <div className="has-padding small text-gray -text-center space-sm">
                ― {Lang.string('chat.noMoreMessage')} ―
            </div>
        );
    }
    return (
        <a
            className="has-padding small text-gray -text-center -block space-sm"
            onClick={handleLoadMoreList}
        >
            ― {Lang.string('chat.loadMoreMessage')} ―
        </a>
    );
};
