import {WindowType} from '~/app/constants';
import * as _FetchHistoryEventsModule from '~/app/core/im/fetch-history-events';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const FetchHistoryEventsModule = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.FetchHistoryEventsModule;
    }

    return _FetchHistoryEventsModule;
})();
