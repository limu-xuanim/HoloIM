import {useAtomValue} from 'jotai';
import {memo} from 'react';
import Icon from '~/app/components/icon';
import Config from '~/app/config';
import {executeCommand} from '~/app/core/commander';
import type ChatMessage from '~/app/core/im/chat-message';
import chatMessagesStore, {isMessagePinnedInChat} from '~/app/core/im/chat-messages-store';
import {sendChatMessage} from '~/app/core/im/im-server';
import {isUserOnline} from '~/app/core/profile';
import {highlightMessageIdAtom} from '~/app/jotai/atoms/highlight-message';
import {formatDate} from '~/app/utils/date-helper';
import {type ClassLike, classes} from '~/app/utils/html-helper';
import useLang from '../common/use-lang';
import MessageContent from './message-content';
import MessageHeader from './message-header';
import MessageStatus from './message-status';

type MessageBubbleItemProps = {
    message: ChatMessage;
    prevMessage?: ChatMessage;
    className?: ClassLike;
    hideHeader?: 'auto' | boolean;
    hideActions?: boolean;
    contentConverter?: (content: string) => string;
    showedDivider?: boolean;
    avatarSize?: number;
    ignoreStatus?: boolean;
    headDateFormat?: string;
};

/**
 * 气泡消息组件
 * @param props React 组件属性对象
 * @param props.message 会话消息对象
 * @param props.prevMessage 上一条会话消息对象
 * @param props.className 类名
 * @param props.contentConverter 文本内容转化回调函数
 * @param props.showedDivider 是否已在消息上方显示分割线，决定头像是否显示
 * @param props.hideHeader='auto' 是否隐藏头部，如果设置为 'auto'，则自动决定是否隐藏
 * @param props.avatarSize 头像大小
 * @param props.hideActions 是否隐藏操作按钮
 * @param props.ignoreStatus 是否忽略消息状态
 * @param props.headDateFormat='hh:mm' 消息发送时间格式字符串
 * @returns JSX.Element
 */
function MessageBubbleItem(props: MessageBubbleItemProps) {
    const {
        className,
        message,
        prevMessage,
        contentConverter,
        hideHeader = 'auto',
        showedDivider = false,
        avatarSize,
        ignoreStatus = false,
        hideActions = false,
        headDateFormat = 'hh:mm',
        ...others
    } = props;

    const [Lang] = useLang();
    const highlightMessageId = useAtomValue(highlightMessageIdAtom);

    const {senderId, type: messageType} = message;
    const needShowHeader =
        hideHeader === false ||
        (hideHeader === 'auto' &&
            (showedDivider ||
                !prevMessage ||
                prevMessage.deleted ||
                prevMessage.senderId !== senderId ||
                prevMessage.type !== messageType ||
                message.date - prevMessage.date > Config.ui['message.interval.minute'] * 60 * 1000));
    const headerView = needShowHeader ? (
        <MessageHeader message={message} avatarSize={avatarSize} staticUI={hideActions} dateFormat={headDateFormat} />
    ) : null;

    const {id, cgid, index} = message;
    const isPinned = isMessagePinnedInChat(id, cgid);
    const pinnedBadge = isPinned ? <Icon name="pin" size={12} className="app-message-pinned-badge" /> : null;
    const classNames = ['app-message-bubble-item', className, {'has-header': headerView, 'is-pinned': isPinned}];

    const handleResendBtnClick = () => {
        if (!isUserOnline()) {
            executeCommand('showMessager', Lang.string('chat.message.cannotSendOnOffline'), {
                type: 'danger',
                icon: 'alert',
            });
            return;
        }
        sendChatMessage(message);
    };
    const handleDeleteBtnClick = () => {
        chatMessagesStore.deleteLocalMessage(id);
    };

    return (
        <div
            className={classes(...classNames, {'highlight-focus': highlightMessageId === `message-${id}`})}
            {...others}
            id={`message-${id}`}
            data-index={`message-${index}`}
        >
            {headerView}
            <div className="app-message-body -gap-1">
                <div
                    className={classes('app-message-bubble', {
                        'is-transparent': message.isEmotionContent,
                    })}
                    data-id={id}
                >
                    <MessageContent message={message} contentConverter={contentConverter} />
                    {pinnedBadge}
                    <div className="app-message-hint hint">
                        {formatDate(message.date, 'yyyy-MM-dd hh:mm:ss')}
                        {isPinned ? `, ${Lang.string('chat.message.pinned')}` : null}
                    </div>
                    {!ignoreStatus && message.isInLocal && (
                        <MessageStatus
                            isSendFailed={message.isSendFailed}
                            isSending={message.isSending}
                            handleDeleteBtnClick={handleDeleteBtnClick}
                            handleResendBtnClick={handleResendBtnClick}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(MessageBubbleItem);
