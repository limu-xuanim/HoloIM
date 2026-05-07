import {WindowType} from '~/app/constants';
import * as _FileDataModule from '~/app/core/files/file-data';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;
export const FileDataModule = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.FileDataModule;
    }
    return _FileDataModule;
})();
