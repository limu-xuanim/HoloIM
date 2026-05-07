import {isCurrentUser} from '~/app/core/profile';
import {isSameDay} from '~/app/utils/date-helper';
import MessageBroadcastItem from './message-broadcast-item';
import MessageBubbleItem from './message-bubble-item';
import MessageDividerItem from './message-divider-item';
import MessageRetractedItem from './message-retracted-item';

type MessageListItemProps = {message: ChatMessage} & Partial<{
    id: number;
    prevMessage: ChatMessage;
    showDateDivider: 'auto' | boolean;
    className: string;
    unread: boolean;
}>;

/**
 * 消息列表项组件，此组件不会跟踪 store 中的消息对象变更，如果需要跟踪变更请使用 ChatMessageListItem
 * @param props React 组件属性对象
 * @param props.message 消息对象
 * @param props.prevMessage 在列表中上一条消息对象
 * @param props.showDateDivider 是否显示日期分割线，如果设置为 'auto'，则为自动决定是否显示
 * @param props.className 类名
 * @param props.unread 未读
 * @returns React Node content
 */
export default function MessageListItem(props: MessageListItemProps) {
    const {message, prevMessage, className, showDateDivider = 'auto', unread, ...others} = props;

    // 已删除的消息
    if (!message || message.localDeleted) {
        return null;
    }

    const {date} = message;
    // 时间分割线
    const dateDividerView =
        showDateDivider === true ||
        (showDateDivider === 'auto' && (!prevMessage || !isSameDay(date, prevMessage.date))) ? (
            <MessageDividerItem className="app-message-item" key="divider" date={date} />
        ) : null;

    const {isNotification, senderId} = message;
    const isSendByMe = isNotification ? false : isCurrentUser(senderId);
    const commonClassName = [
        // 通用类名
        className,
        'app-message-item',
        `app-message-type-${message.type}`,
        `is-content-type-${message.contentType}`,
        isSendByMe ? 'is-send-by-me' : null,
    ];

    if (unread) {
        commonClassName.push('is-unread');
    }

    // 根据类型获取消息组件
    let messageItemView: React.ReactNode;
    const {retracted, isBroadcast} = message;
    if (retracted || isBroadcast) {
        delete others.hideHeader;
        delete others.avatarSize;
        delete others.headDateFormat;
        delete others.hideActions;
        delete others.ignoreStatus;
        const MessageItemComponent = retracted ? MessageRetractedItem : MessageBroadcastItem;
        messageItemView = (
            <MessageItemComponent key="message" className={commonClassName} message={message} {...others} />
        );
    } else {
        messageItemView = (
            <MessageBubbleItem
                key="message"
                className={commonClassName}
                message={message}
                prevMessage={prevMessage}
                showedDivider={!!dateDividerView}
                {...others}
            />
        );
    }

    return (
        <>
            <span>{message.isSendFailed}</span>
            {dateDividerView}
            {messageItemView}
        </>
    );
}
