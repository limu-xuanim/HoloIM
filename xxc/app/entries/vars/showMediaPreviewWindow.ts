import {WindowType} from '~/app/constants';
import {showMediaPreviewWindow as _showMediaPreviewWindow} from '../gallery/open-window';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const showMediaPreviewWindow = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.showMediaPreviewWindow;
    }
    return _showMediaPreviewWindow;
})();
