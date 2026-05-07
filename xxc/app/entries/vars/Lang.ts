import {WindowType} from '~/app/constants';
import _Lang from '~/app/core/lang';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const Lang = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.Lang;
    }

    return _Lang;
})();
