import { useState, useEffect, useRef } from 'react';
import { getTimeBeforeDesc } from '~/app/utils/date-helper';
import { isEmptyString } from '~/app/utils/check-empty';
import AbortHandler from '~/app/utils/abort-handler';
import { searchChatsMessagesInDatabase } from '~/app/core/im/chat-messages-search';

export type SearchResult = {
    cgid: string;
    count: number;
    list: ChatMessage[];
};

/**
 * 消息搜索 Hook
 * @param keys 搜索关键字
 * @param chats 通过会话 GID 列表指定搜索哪些会话
 * @param options 其他选项
 * @param options.minDate 日最小日期时间戳，只搜索此日期之后的会话记录
 * @param options.dateRange 使用描述字符串来指定日期范围
 * @param options.returnType 是否返回原始数据、ChatMessage或仅仅返回数目
 * @param options.limit 最多返回结果数目，如果为 0 则返回所有符合条件的结果
 * @returns 搜索结果
 */
export default function useMessagesSearch(
    keys: string,
    chats: string,
    options: Partial<{
        minDate: number;
        dateRange: string;
        limit: number;
    }> = {}
) {
    const [searchingChats, setSearchingChats] = useState<string[]>([]);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchProgress, setSearchProgress] = useState(0);
    const currentAbortRef = useRef<AbortHandler | null>(null);
    const searchKeyRef = useRef<string | null>(null);
    const { dateRange, minDate, limit } = options;

    useEffect(() => {
        const searchKey = [keys, chats, minDate, dateRange].join(',');
        if (searchKey === searchKeyRef.current) {
            return;
        }

        searchKeyRef.current = searchKey;
        if (currentAbortRef.current) {
            currentAbortRef.current.abort();
            currentAbortRef.current = null;
        }

        if (isEmptyString(keys)) {
            setSearchProgress(100);
            setSearchResults([]);
            setSearchingChats([]);
            return;
        }

        const search = async () => {
            const abortHandler = new AbortHandler();
            currentAbortRef.current = abortHandler;
            const currentSearchingChats = new Set<string>();
            setSearchProgress(0);
            setSearchResults([]);
            setSearchingChats([]);
            const finalMinDate = dateRange ? getTimeBeforeDesc(dateRange) : minDate;
            const beforeSearch = (pendingChats: string[]) => {
                if (currentAbortRef.current !== abortHandler) {
                    return;
                }

                for (const pendingChat of pendingChats) {
                    currentSearchingChats.add(pendingChat);
                }
                setSearchingChats(pendingChats);
            };

            const results: SearchResult[] = [];
            const afterSearchChat = (cgid: string, result: SearchResult, index: number, cgids: string[]) => {
                if (currentAbortRef.current !== abortHandler) {
                    return;
                }
                if (index === (cgids.length - 1)) {
                    return;
                }
                results.push(result);
                setSearchResults([...results]);

                currentSearchingChats.delete(cgid);
                setSearchingChats([...currentSearchingChats]);
                setSearchProgress((cgids.length - currentSearchingChats.size) / cgids.length);
            };
            const finalResults = await searchChatsMessagesInDatabase(keys, chats, {
                minDate: finalMinDate,
                abortHandler,
                limit,
                beforeSearch,
                afterSearchChat,
            });
            if (currentAbortRef.current !== abortHandler) {
                return;
            }
            currentAbortRef.current = null;
            setSearchResults(finalResults);
            setSearchProgress(100);
            setSearchingChats([]);
        };

        search();
    }, [keys, chats, dateRange, minDate, limit]);

    useEffect(() => () => {
        if (currentAbortRef.current) {
            currentAbortRef.current.abort();
            currentAbortRef.current = null;
        }
    }, []);

    return {
        searching: !!(searchingChats?.length),
        searchProgress,
        searchResult: searchResults,
        searchingChats,
    };
}
