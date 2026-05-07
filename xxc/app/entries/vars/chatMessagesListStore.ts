import {WindowType} from '~/app/constants';
import _chatMessagesListStore from '~/app/core/im/chat-messages-list-store';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const chatMessagesListStore = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.chatMessagesListStore;
    }

    return _chatMessagesListStore;
})();
