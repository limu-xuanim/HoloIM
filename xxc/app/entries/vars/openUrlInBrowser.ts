import {WindowType} from '~/app/constants';
import {openUrlInBrowser as _openUrlInBrowser} from '~/app/core/ui/url';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const openUrlInBrowser = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.openUrlInBrowser;
    }

    return _openUrlInBrowser;
})();
