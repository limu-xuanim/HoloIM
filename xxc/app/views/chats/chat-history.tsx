import {memo, useEffect, useRef, useState} from 'react';
import Pager from '~/app/components/pager';
import Spinner from '~/app/components/spinner';
import {classes} from '~/app/utils/html-helper';
import ChatTitle from './chat-title';
import useLang from '../common/use-lang';
import useMessagesHistory from './use-messages-history';
import MessageList from './message-list';

type ChatHistoryProps = {
    cgid: string;
    className?: string;
    hidden?: boolean;
};

/**
 * 消息历史记录界面
 * @param props React 组件属性对象
 * @param props.cgid 会话 GID
 * @param props.className 类名
 * @returns JSX.Element
 */
function ChatHistory(props: ChatHistoryProps) {
    const {cgid, className, hidden = false} = props;
    const [activeChat, setActiveChat] = useState(cgid);
    const [Lang] = useLang();
    const messageListRef = useRef<HTMLDivElement>();

    useEffect(() => {
        setActiveChat(cgid);
    }, [cgid]);

    const [list, pager, fetching, setPage, forward] = useMessagesHistory(activeChat);

    // 向前翻页时自动拉到底部，向后翻页时自动拉到顶部
    useEffect(() => {
        if (!fetching && pager) {
            const div = document.getElementById(`chat-history-content-${cgid}`);
            if (div) {
                if (forward) {
                    div.scrollTop = div.scrollHeight;
                } else {
                    div.scrollTop = 0;
                }
            }
        }
    }, [cgid, pager, fetching, forward]);

    let pagerView = null;
    if (pager) {
        pagerView = (
            <nav className="toolbar -flex -items-center -whitespace-nowrap">
                <Pager
                    onPageChange={fetching ? null : setPage}
                    page={pager.pageID}
                    recTotal={pager.recTotal}
                    recPerPage={pager.recPerPage}
                    pageTotal={pager.pageTotal}
                />
            </nav>
        );
    }

    const chatTitleView = (
            <ChatTitle className="-flex-none has-padding-h" cgid={cgid}>
                {pagerView}
            </ChatTitle>
        );
    const messageListView = list?.length
        ? (
            <div
                id={`chat-history-content-${cgid}`}
                className="-flex-auto user-selectable scrollbar-hover -overflow-auto -w-full"
                ref={messageListRef}
            >
                <MessageList
                    cgid={cgid}
                    messagesOrIndexes={list}
                    bubbleContextMenu
                />
            </div>
        )
        : (
            <div className="-w-full -h-full -flex -justify-center -items-center">
                <span className="text-xs">{Lang.string('chat.message.getFail')}</span>
            </div>
        );

    return (
        <div className={classes('app-chat-history column single', className, {hidden})}>
            {chatTitleView}
            {
                fetching
                    ? <div className="-flex-auto center-content"><Spinner /></div>
                    : messageListView
            }
        </div>
    );
}

export default memo(ChatHistory);
