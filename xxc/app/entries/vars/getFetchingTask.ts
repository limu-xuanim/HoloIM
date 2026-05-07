import {WindowType} from '~/app/constants';
import {getFetchingTask as _getFetchingTask} from '~/app/core/im/chat-messages-history';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const getFetchingTask = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.getFetchingTask;
    }

    return _getFetchingTask;
})();
