import {ChatAvatarCommon} from '../chat-avatar';

type MenuChatAvatarProps = {
    showAvatar: boolean;
    chat: Chat;
};

export default function MenuChatAvatar(props: MenuChatAvatarProps) {
    const {showAvatar, chat} = props;

    if (!showAvatar) {
        return null;
    }

    return (
        <ChatAvatarCommon
            chat={chat}
            avatarSize={34}
            className="-flex-none"
            showStatusDot
        />
    );
}
