import {WindowType} from '~/app/constants';
import type {ImageInfo} from '~/app/core/im/chat-message-image-obtainer';
import {showChatMessageImagePreivew as _showChatMessageImagePreivew} from '~/app/views/chats/chat-message-image-preview';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const showChatMessageImagePreivew = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.showChatMessageImagePreivew;
    }
    return _showChatMessageImagePreivew;
})();
