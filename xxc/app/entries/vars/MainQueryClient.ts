import {WindowType} from '~/app/constants';
import {MainQueryClient as _MainQueryClient} from '~/app/core/query-client';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const MainQueryClient = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.MainQueryClient;
    }

    return _MainQueryClient;
})();
