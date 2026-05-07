import {WindowType} from '~/app/constants';
import {getContextMenuItems as _getContextMenuItems} from '~/app/core/context-menu';

const entry = process.env.ENTRY as ValueOf<typeof WindowType>;

export const getContextMenuItems = (() => {
    if (entry === WindowType.chathistory) {
        return window.chathistoryAPI.getContextMenuItems;
    }

    return _getContextMenuItems;
})();
