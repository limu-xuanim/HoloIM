import { memo, useEffect, useMemo, useState } from 'react';
import ErrorBoundary from '~/app/components/error-boundary';
import { classes } from '~/app/utils/html-helper';
import { isNotEmptyString } from '~/app/utils/check-empty';
import useLang from '../common/use-lang';
import ChatsHistoryHeader from './chats-history-header';
import ChatsHistoryMenu from './chats-history-menu';
import ChatHistory from './chat-history';
import ChatHistorySearch from './chat-history-search';
import useMessagesSearch, { type SearchResult } from './use-messages-search';
import { WindowType } from '~/app/constants';
import { useAtomValue } from 'jotai';
import { searchFileTypeAtom, searchKeysAtom, searchTimeAtom, searchTypeAtom } from '~/app/jotai/atoms/history';

type HistoryViewProps = {
    selectedChat: string;
    searchKeys: string;
    searching: boolean;
    searchResult: SearchResult[];
    searchResultMap: Map<string, number> | null;
};

function HistoryView(props: HistoryViewProps) {
    const { selectedChat, searchKeys, searching, searchResult, searchResultMap } = props;
    const [Lang] = useLang();

    if (!selectedChat) {
        return (
            <div className="-flex-auto center-content muted"><div>{Lang.string('chats.history.selectChatTip')}</div></div>
        );
    }

    if (isNotEmptyString(searchKeys)) {
        return (
            <ChatHistorySearch
                className="-flex-auto white"
                cgid={selectedChat}
                searching={searching}
                searchResult={searchResult}
                searchKeys={searchKeys}
                searchResultMap={searchResultMap}
            />
        );
    }

    return (
        <ChatHistory className="-flex-auto white" cgid={selectedChat} />
    );
}

type ChatsHistoryProps = { cgid: string; }

/**
 * 消息记录界面
 * @param props React 组件属性对象
 * @param props.className 类名
 * @param props.cgid 默认选中的会话 GID
 * @returns React Node content
 */
function ChatsHistory(props: ChatsHistoryProps) {
    const { cgid } = props;
    const [Lang] = useLang();
    const [selectedChat, setSelectedChat] = useState(cgid);
    const searchKeys = useAtomValue(searchKeysAtom);
    const searchTimeFilter = useAtomValue(searchTimeAtom);
    const searchTypeFilter = useAtomValue(searchTypeAtom);
    const searchFileTypeFilter = useAtomValue(searchFileTypeAtom);
    const finalSearchKeys = useMemo(
        () => (!searchKeys && !searchFileTypeFilter) ? '' : `${searchKeys} ${searchFileTypeFilter}`,
        [searchKeys, searchFileTypeFilter]
    );

    const {
        searchResult, searching, searchingChats, searchProgress
    } = useMessagesSearch(
        finalSearchKeys,
        searchTypeFilter === 'choosed' ? selectedChat : searchTypeFilter,
        {
            dateRange: searchTimeFilter,
        }
    );

    const searchResultMap = useMemo(() => {
        if (!searchResult) {
            return null;
        }

        const map = new Map<string, number>();
        for (const result of searchResult) {
            if (result.count) {
                map.set(result.cgid, result.count);
            }
        }
        return map;
    }, [searchResult]);

    // 找到的结果总数
    const searchResultCount = useMemo(() => {
        let count = 0;
        if (searchResultMap) {
            for (const x of searchResultMap.values()) {
                count += x;
            }
        }
        return count;
    }, [searchResultMap]);

    // 构建搜索提示文本
    const searchingTip = useMemo(() => {
        if ((isNotEmptyString(searchKeys) || isNotEmptyString(searchFileTypeFilter)) && searchProgress === 100) {
            return Lang.format('chats.history.search.result.format', searchResultCount);
        }

        let tip = '';
        if (searching) {
            const searchingChatsCount = searchingChats.length;
            if (searchingChatsCount > 0) {
                tip = Lang.format('chats.history.searching.format', searchingChatsCount);
            }
            if (!tip) {
                tip = Lang.string('chats.history.searching');
            }
        }
        return tip;
    }, [Lang, searchKeys, searchProgress, searchResultCount, searching, searchingChats?.length, searchFileTypeFilter]);

    useEffect(() => {
        const cgidList = searchResult.filter(x => x.count > 0).map(x => x.cgid);
        if (!cgidList.length) {
            return;
        }

        if (!cgidList.includes(selectedChat)) {
            setSelectedChat(cgidList[0]);
        }
    }, [searchResult, selectedChat]);


    return (
        <div className={classes('app-chats-history dock -flex -flex-nowrap', { '-top-5': process.env.ENTRY === WindowType.chathistory })}>
            <ChatsHistoryMenu
                className="-flex-none"
                selectedChat={selectedChat}
                onSelectChat={setSelectedChat}
                searchTypeFilter={searchTypeFilter}
                searchResultMap={searchResultMap}
            />
            <div className="app-chats-history-content -flex -flex-col -flex-nowrap -flex-auto -overflow-auto">
                <ChatsHistoryHeader
                    className="-flex-none"
                    searchProgress={searchProgress}
                    searchingTip={searchingTip}
                    selectedChat={selectedChat}
                />
                <ErrorBoundary>
                    <HistoryView
                        selectedChat={selectedChat}
                        searchKeys={finalSearchKeys}
                        searching={searching}
                        searchResult={searchResult}
                        searchResultMap={searchResultMap}
                    />
                </ErrorBoundary>
            </div>
        </div>
    );
}

export default memo(ChatsHistory);
