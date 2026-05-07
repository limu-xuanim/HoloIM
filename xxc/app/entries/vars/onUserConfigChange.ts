import {WindowType} from '~/app/constants';
import {onUserConfigChange as _onUserConfigChange} from '~/app/core/profile/user';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const onUserConfigChange = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.onUserConfigChange;
    }
    return _onUserConfigChange;
})();
