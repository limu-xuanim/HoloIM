import {memo, useCallback, useEffect, useRef, useState} from 'react';
import Avatar from '~/app/components/avatar';
import EmojiIcon from '~/app/components/emoji-icon';
import Spinner from '~/app/components/spinner';
import {classes} from '~/app/utils/html-helper';
import useLang from '../common/use-lang';
import ChatMessageContext from './chat-message-context';
import MessageList from './message-list';
import useChat from './use-chat';
import type {SearchResult} from './use-messages-search';


/**
 * 搜查结果超过此值则判定数目过多
 */
const MANY_RESULT_COUNT = 100;

/**
 * 最多显示的搜索结果数目
 */
const MAX_RESULT_COUNT = 200;

type ChatHistorySearchProps = {
    className?: string;
    cgid: string;
    searching: boolean;
    searchKeys: string;
    searchResult: SearchResult[];
    searchResultMap: Map<string, number> | null;
};

/**
 * 会话搜索结果界面
 * @param props React 组件属性对象
 * @param props.cgid 会话 GID
 * @param props.searchKeys 搜索关键字
 * @param props.timeFilter 时间范围过滤类型
 * @param props.className 类名
 * @returns React Node content
 */
function ChatHistorySearch(props: ChatHistorySearchProps) {
    const {cgid, className, searching, searchResult, searchKeys, searchResultMap} = props;
    const [Lang] = useLang();
    const [chat] = useChat(cgid);
    const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
    const [messageContextCgid, setMessageContextCgid] = useState(cgid);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessageContextCgid(cgid);
    }, [cgid]);

    const count = searchResultMap?.get(cgid) ?? 0;
    const list = searchResult?.find((item) => item.cgid === cgid)?.list ?? [];

    let selectedMessageID = selectedMessage;
    if (count) {
        if (list.some((x) => x.id === selectedMessage)) {
            selectedMessageID = selectedMessage;
        } else {
            selectedMessageID = list[0].id;
            if (messageContextCgid !== list[0].cgid) {
                setMessageContextCgid(list[0].cgid);
            }
        }
    }

    const handleClickItem = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const itemElement = (event.target as HTMLElement).closest('.app-message-item');
        if (!itemElement) {
            return;
        }
        const id = itemElement.getAttribute('data-id');
        if (!id) {
            return;
        }
        setSelectedMessage(+id);
    }, []);

    const contentConverter = useCallback(
        (content: string, chatMessage: ChatMessage) => {
            if (!chatMessage || chatMessage.id !== selectedMessageID) {
                return content;
            }
            const pattern = new RegExp(`(${searchKeys.split(' ').join('|')})(?![^<]*>)`, 'gi');
            if (pattern?.test(content)) {
                content = content.replace(pattern, "<span class='highlight'>$1</span>");
            }
            setMessageContextCgid(chatMessage.cgid);
            return content;
        },
        [searchKeys, selectedMessageID],
    );

    const itemPropsGenerator = useCallback(
        (item) => ({
            showDateDivider: false,
            hideHeader: false,
            avatarSize: 20,
            headDateFormat: 'yyyy-MM-dd hh:mm',
            className: item.id === selectedMessageID ? 'state active' : 'state',
            'data-id': item.id,
            hideActions: true,
            contentConverter,
        }),
        [selectedMessageID, contentConverter],
    );

    if (searching || !chat) {
        return (
            <div className={classes('center-content', className)}>
                <Spinner />
            </div>
        );
    }

    if (!count) {
        return (
            <div className={classes('center-content', className)}>
                <div>
                    <EmojiIcon name=":duck:" className="-text-center" />
                    <div className="text-gray small">{Lang.string('chats.history.search.result.noResults')}</div>
                </div>
            </div>
        );
    }

    if (list.length > MAX_RESULT_COUNT) {
        list.splice(MAX_RESULT_COUNT, list.length - MAX_RESULT_COUNT);
    }

    return (
        <div className={classes('app-chat-history-search white row single', className)} ref={ref}>
            <div className="app-chat-history-search-result column single -flex-none">
                <header className="heading -flex-none gray">
                    <div className="title">
                        <small>{Lang.format('chats.chat.search.result.format', chat.name, count)}</small>
                    </div>
                </header>
                <div className="-flex-auto user-selectable -overflow-y-auto -overflow-x-auto scrollbar-hover fluid">
                    <MessageList
                        cgid={cgid}
                        className="use-font-size-12"
                        messagesOrIndexes={list}
                        listItemProps={itemPropsGenerator}
                        onClick={handleClickItem}
                        bubbleContextMenu
                        needResort
                    />
                </div>
                {list.length > MANY_RESULT_COUNT && (
                    <div className="-flex-none heading info-pale">
                        <Avatar icon="information-outline" />
                        <div className="title">
                            <small>
                                {count > MAX_RESULT_COUNT
                                    ? Lang.format(
                                          'chats.history.search.result.notShow.format',
                                          count - MAX_RESULT_COUNT,
                                      )
                                    : ''}
                                {Lang.string('chats.history.search.result.toMany')}
                            </small>
                        </div>
                    </div>
                )}
            </div>
            <ChatMessageContext
                className="-flex-auto"
                messageID={selectedMessageID}
                cgid={messageContextCgid}
                messageContentConverter={contentConverter}
            />
        </div>
    );
}

export default memo(ChatHistorySearch);
