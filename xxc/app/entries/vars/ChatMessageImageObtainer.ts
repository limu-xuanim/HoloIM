import {WindowType} from '~/app/constants';
import {ChatMessageImageObtainer as _ChatMessageImageObtainer} from '~/app/core/im/chat-message-image-obtainer';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const ChatMessageImageObtainer = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.ChatMessageImageObtainer;
    }

    return _ChatMessageImageObtainer;
})();
