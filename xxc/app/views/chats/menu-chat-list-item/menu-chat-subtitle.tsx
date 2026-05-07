import useChatTyping from '../use-chat-typing';
import ChatMessage, {TYPES} from '~/app/core/im/chat-message';
import {getChatMessageSummaryText} from '~/app/core/im/chat-message-helper';
import MemberNameSpan from '../../common/member-name-span';
import {isNotEmptyArray} from '~/app/utils/check-empty';
import {renderIf} from '~/app/utils/render';
import Icon from '~/app/components/icon';
import {getCurrentUserID} from '~/app/core/profile';
import MenuChatLabels from './menu-chat-labels';

type MenuChatSubTitleProps = {
    chat: Chat;
    currentUser: User;
    unreadMessagesCount: number;
    hideOnLoading: boolean;
    Lang: LangHelper;
};

export default function MenuChatSubtitle(props: MenuChatSubTitleProps) {
    const {chat, currentUser, unreadMessagesCount, hideOnLoading, Lang} = props;
    const {lastMessageInfo: lastMessage} = chat;
    const typing = useChatTyping(chat.gid);

    const labelsView = MenuChatLabels({
        Lang,
        currentUser,
        chat,
        unreadMessagesCount
    });

    const getSubtitle = () => {
        if (typing) {
            return Lang.string('chat.one2one.typing');
        }

        if (!lastMessage) {
            return null;
        }

        if (lastMessage.contentType !== 'object' && lastMessage.type === TYPES.notify) {
            const data = lastMessage?.data || lastMessage;
            const {sender, title} = data;
            const name = sender?.realname || sender?.name || sender?.id;
            if (title && name) {
                return `${name}: ${title}`;
            }
            if (title) {
                return title;
            }

            return '';
        }

        let {senderId} = lastMessage;
        const {summary, type, user} = lastMessage;
        senderId ||= user;
        let summaryText = summary;
        if (!summaryText) {
            summaryText = getChatMessageSummaryText(new ChatMessage(lastMessage), 100);
        }

        if (summaryText) {
            const subtitle = summaryText;
            if (chat.isGroupOrSystem && type !== TYPES.notify) {
                if (senderId === getCurrentUserID()) {
                    return `${Lang.string('chat.message.senderMe')}: ${subtitle}`;
                }

                return <MemberNameSpan hideOnLoading={hideOnLoading} memberID={senderId}>: {subtitle}</MemberNameSpan>;
            }
            return subtitle;
        }

        return null;
    }

    const subtitle = getSubtitle();
    return renderIf(subtitle || isNotEmptyArray(labelsView)) && (
        <div className="subtitle -flex -justify-between -items-center">
            <div className="x-text-ellipsis">{labelsView}{subtitle}</div>
            {chat.star ? (<Icon name="pin" size={12} className="star-icon" />) : null}
        </div>
    );
}
