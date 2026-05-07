import {WindowType} from '~/app/constants';
import _deptsStore from '~/app/core/members/depts-store';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const deptsStore = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.deptsStore;
    }

    return _deptsStore;
})();
