import {WindowType} from '~/app/constants';
import * as _ChatMessagesStoreModule from '~/app/core/im/chat-messages-store';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const ChatMessagesStoreModule = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.ChatMessagesStoreModule;
    }
    if (entry === WindowType.gallery) {
        return window.galleryAPI.ChatMessagesStoreModule
    }
    return _ChatMessagesStoreModule;
})();
