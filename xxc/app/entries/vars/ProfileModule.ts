import * as _ProfileModule from '~/app/core/profile';
import {WindowType} from '~/app/constants';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const ProfileModule = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.ProfileModule;
    }
    return _ProfileModule;
})();
