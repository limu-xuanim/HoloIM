import {WindowType} from '~/app/constants';
import _socket from '~/app/core/server/socket';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const socket = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.socket;
    }

    return _socket;
})();
