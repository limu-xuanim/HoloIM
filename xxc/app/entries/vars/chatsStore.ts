import _chatsStore from '~/app/core/im/chats-store';
import {WindowType} from '~/app/constants';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const chatsStore = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.chatsStore;
    }

    return _chatsStore;
})();
