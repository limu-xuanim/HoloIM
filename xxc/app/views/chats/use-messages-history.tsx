import {useState, useEffect, useRef} from 'react';
import {ChatMessagesStoreModule} from '~/app/entries/vars/ChatMessagesStoreModule';
import type {Pager} from '~/app/core/im/chat-messages-store';

const {default: chatMessagesStore} = ChatMessagesStoreModule;

/**
 * 会话消息历史记录 Hook
 * @param cgid 会话 GID
 * @param defaultPager 默认分页对象
 * @returns 分别为消息列表、分页对象、是否正在获取消息、设置新的分页、 是否在向前翻页
 */
export default function useMessagesHistory(cgid: string, defaultPager?: Pager) {
    const [pager, setPager] = useState(defaultPager);
    const [list, setList] = useState<ChatMessage[]>([]);
    const [fetching, setFetching] = useState(false);
    const fetchingKeyRef = useRef('');
    const reverseRef = useRef(true);

    useEffect(() => {
        const newKey = `${cgid} ${(pager && pager.pageID !== pager.pageTotal) ? pager.pageID : ''}`;
        const cgidChanged = fetchingKeyRef.current?.includes(cgid);
        if (fetchingKeyRef.current === newKey) {
            return;
        }

        fetchingKeyRef.current = newKey;
        const fetchMessages = async () => {
            const fetchingKey = fetchingKeyRef.current;
            setFetching(true);
            const {pager: newPager, list: newList, nextPager, prevPager} = await chatMessagesStore.fetchChatMessagesByPage(cgid, {
                pager: cgidChanged ? pager : undefined,
                reverse: cgidChanged ? reverseRef.current : true,
                putToCache: false,
                skipChatFilter: true // 加上这个参数，防止在后续获取跟chat有关的数据会被过滤掉
            });

            if (fetchingKeyRef.current !== fetchingKey) {
                return;
            }
            newPager.nextPager = nextPager;
            newPager.prevPager = prevPager;

            // 确保 ID 从小到大排列
            if (newList.length >= 2 && newList[0]?.id > newList[1]?.id) {
                newList.reverse();
            }

            setList(newList);
            setPager(newPager);
            setFetching(false);
        };
        fetchMessages();
    }, [cgid, pager]);

    useEffect(() => () => {
        fetchingKeyRef.current = '';
    }, []);

    const setPage = (page: number) => {
        if (pager && typeof pager === 'object') {
            const newPage = Math.max(1, Math.min(pager.pageTotal, page));
            if (newPage === pager.pageID) {
                return false;
            }
            let newPager: Pager;
            if (Math.abs(newPage - pager.pageID) > 1) {
                newPager = {...pager, pageID: newPage, range: [0, Number.MAX_SAFE_INTEGER]};
                if (newPage === 1) {
                    reverseRef.current = false;
                } else if (newPage === pager.pageTotal) {
                    reverseRef.current = true;
                } else {
                    return false;
                }
            } else {
                newPager = newPage < pager.pageID ? pager.prevPager : pager.nextPager;
                reverseRef.current = newPage < pager.pageID;
            }
            setPager(newPager);
            return true;
        }
        return false;
    };

    return [list, pager, fetching, setPage, reverseRef.current] as const;
}
