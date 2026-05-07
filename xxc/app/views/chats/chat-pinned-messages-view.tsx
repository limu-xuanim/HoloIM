import {memo, useState, useCallback, useEffect} from 'react';
import chatsStore from '../../core/im/chats-store';
import chatMessagesStore from '../../core/im/chat-messages-store';
import Button from '../../components/button';
import Icon from '../../components/icon';
import {showContextMenu} from '../../core/context-menu';
import useChatPinnedMessages from './use-chat-pinned-messages';
import MessageSummarySpan from './message-summary-span';
import { showChatMessage } from '~/app/core/im/im-ui';

/**
 * 根据 ContextMenu 事件显示消息置顶菜单
 * @param event ContextMenu 事件对象
 */
function showPinnedMessageContextMenu(event) {
    const messageID = event.currentTarget.attributes['data-message'].value;
    const message = chatMessagesStore.getMessage(+messageID);
    if (!message) {
        return;
    }
    const chat = chatsStore.getChat(message.cgid);
    showContextMenu('chat.pinned', {event, chat, message});
    event.preventDefault();
}

type ChatPinnedMessageViewProps = {
    gid: string;
};

/**
 * 置顶消息列表组件
 * @param props React 组件属性对象
 * @param props.gid 会话 GID
 * @returns JSX.Element
 */
function ChatPinnedMessageView(props: ChatPinnedMessageViewProps) {
    const {gid} = props;
    const pinnedMessages = useChatPinnedMessages(gid);
    const [index, setIndex] = useState(pinnedMessages.length > 0 ? pinnedMessages.length - 1 : 0);

    const handlePrevBtnClick = useCallback(() => {
        setIndex(x => (x - 1 + pinnedMessages.length) % pinnedMessages.length);
    }, [pinnedMessages.length]);

    const handleNextBtnClick = useCallback(() => {
        setIndex(x => (x + 1) % pinnedMessages.length);
    }, [pinnedMessages.length]);

    useEffect(() => {
        setIndex(pinnedMessages.length > 0 ? pinnedMessages.length - 1 : 0);
    }, [pinnedMessages]);

    if (pinnedMessages.length === 0) {
        return null;
    }

    const messageID = pinnedMessages[index];

    return (
        <div className="app-chat-pinned-messages row single -flex-none text-primary primary-pale">
            <div className="app-chat-pinned-messages-content row single -items-center">
                <Icon name="pin" className="-flex-none" /> &nbsp;
                <MessageSummarySpan
                    type="a"
                    onClick={() => {showChatMessage(gid, messageID);}}
                    className="small -flex-auto"
                    messageID={messageID}
                    cgid={gid}
                    data-message={messageID}
                    onContextMenu={showPinnedMessageContextMenu}
                />
            </div>
            {pinnedMessages.length > 1 && (
                <div className="app-chat-pinned-messages-actions -flex-none column single -justify-center" title={`${index + 1}/${length}`}>
                    <Button key="pinned-page-up" icon="chevron-up" className="btn-sm button-up" disabled={index === 0} onClick={handlePrevBtnClick} />
                    <Button key="pinned-page-down" icon="chevron-down" className="btn-sm button-down" disabled={index === pinnedMessages.length - 1} onClick={handleNextBtnClick} />
                </div>
            )}
        </div>
    );
}

export default memo(ChatPinnedMessageView);
