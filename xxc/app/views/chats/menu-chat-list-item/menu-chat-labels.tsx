import {getChatMessageMentionType} from '~/app/core/im/chat-message-helper';

type MenuChatLabelsProps = {
    currentUser: User;
    chat: Chat;
    unreadMessagesCount: number;
    Lang: LangHelper;
};

export default function MenuChatLabels(props: MenuChatLabelsProps) {
    const {chat, unreadMessagesCount, Lang} = props;
    const {lastMessageInfo: lastMessage, fileSavedNoticeCount} = chat;
    const labelsView = [];

    if (unreadMessagesCount || fileSavedNoticeCount) {
        const mentionType = chat.unreadMessagesCount !== 0 && lastMessage ? getChatMessageMentionType(lastMessage.content) : false;
        const mentionLabel = mentionType && Lang.string(mentionType === 'me' ? 'chat.status.atMe' : 'chat.status.atAll');
        if (mentionLabel) {
            labelsView.push(<span key="mention" className="label label-xs accent -rounded">{mentionLabel}</span>);
        }
    }
    if (fileSavedNoticeCount) {
        labelsView.push(<span key="fileSaved" className="label label-xs accent -rounded">{fileSavedNoticeCount > 1 ? Lang.format('chats.menu.fileSaved', fileSavedNoticeCount) : Lang.string('chats.menu.fileSaved')}</span>);
    }

    return labelsView;
}
