import Icon from '~/app/components/icon';
import {describeDateFromNow} from '~/app/utils/date-helper';
import {classes} from '~/app/utils/html-helper';
import {renderIf} from '~/app/utils/render';
import {isEmptyString} from '~/app/utils/check-empty';
import useLang from '~/app/views/common/use-lang';

type MenuChatTitleProps = {
    chat: Chat;
    showAvatar: boolean;
    unreadMessagesCount: number;
};

/**
 * 菜单会话标题
 */
export default function MenuChatTitle(props: MenuChatTitleProps) {
    const {chat, unreadMessagesCount, showAvatar} = props;
    const {lastMessageInfo: lastMessage, name: chatName} = chat;
    const [Lang] = useLang();

    if (!lastMessage) {
        return (
            <div className="title">
                <span className={classes('text x-text-ellipsis x-text-black', isEmptyString(chatName) ? 'loading-holder -relative loading-holder-line' : '')}>
                    {chatName}
                </span>
                {chat.mute && <Icon name="bell-off" className="muted icon-sm" />}
                {renderIf(chat.star) && (<Icon name="pin" size={12} className="star-icon time" />)}
            </div>
        );
    }

    // 为系统群按照其最后一条消息时间计算时间文本
    return (
        <div className="title">
            <span className={classes('text x-text-ellipsis x-text-black', isEmptyString(chatName) ? 'loading-holder -relative loading-holder-line' : '')}>
                {chatName}
                {
                    renderIf(!showAvatar && unreadMessagesCount > 0) && (
                        <span className="label red -rounded-full label-xs">{unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}</span>
                    )
                }
            </span>
            {chat.mute && <Icon name="bell-off" className="muted icon-sm" />}
            <small className="time">{describeDateFromNow(Lang, lastMessage.date)}</small>
        </div>
    );
}
