import {WindowType} from '~/app/constants';
import _membersStore from '~/app/core/members/members-store';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const membersStore = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.membersStore;
    }

    return _membersStore;
})();
