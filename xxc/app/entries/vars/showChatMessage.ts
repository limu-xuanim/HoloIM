import {WindowType} from '~/app/constants';
import {showChatMessage as _showChatMessage} from '~/app/core/im/im-ui';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const showChatMessage = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.showChatMessage;
    }

    return _showChatMessage;
})();
