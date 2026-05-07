import {WindowType} from '~/app/constants';
import * as _FilesStoreModule from '~/app/core/files/files-store';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const FilesStoreModule = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.FilesStoreModule;
    }
    return _FilesStoreModule;
})();
