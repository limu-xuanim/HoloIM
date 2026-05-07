import {WindowType} from '~/app/constants';
import {openWebviewWindow as _openWebviewWindow} from '../webview/open-window';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const openWebviewWindow = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.openWebviewWindow;
    }

    return _openWebviewWindow;
})();
