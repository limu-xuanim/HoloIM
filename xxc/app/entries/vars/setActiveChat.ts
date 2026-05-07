import {WindowType} from '~/app/constants';
import {setActiveChat as _setActiveChat} from '~/app/core/im/chat-active-state';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const setActiveChat = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.setActiveChat;
    }

    return _setActiveChat;
})();
