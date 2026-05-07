import {showChatsHistoryDialog} from '../../views/chats/chats-history-dialog';
import platform from '~/app/platform';
import Lang from '~/app/core/lang';
import chatsStore from '~/app/core/im/chats-store';
import chatMessagesListStore from '~/app/core/im/chat-messages-list-store';
import membersStore from '~/app/core/members/members-store';
import {getContextMenuItems} from '~/app/core/context-menu';
import {showChatMessageImagePreivew} from '../../views/chats/chat-message-image-preview';
import {showMediaPreviewWindow} from '../gallery/open-window';
import {openWebviewWindow} from '../webview/open-window';
import {setActiveChat} from '~/app/core/im/chat-active-state';
import {getFetchingTask} from '~/app/core/im/chat-messages-history';
import {openUrl, openUrlInBrowser} from '~/app/core/ui/url';
import {exposeInWindow, generateWindowFeatures, generateWindowUrl, getTargetWindow, getMainWindow, openWindow} from '~/app/window-bridge/common';
import {WindowType} from '~/app/constants';
import socket from '~/app/core/server/socket';
import deptsStore from '~/app/core/members/depts-store';
import {MainQueryClient} from '~/app/core/query-client';
import {showChatMessage} from '~/app/core/im/im-ui';
import {onUserConfigChange} from '~/app/core/profile/user';
import * as FileDataModule from '~/app/core/files/file-data';
import * as FetchHistoryEventsModule from '~/app/core/im/fetch-history-events';
import * as FilesStoreModule from '~/app/core/files/files-store';
import * as ChatMessagesStoreModule from '~/app/core/im/chat-messages-store';
import * as ProfileModule from '~/app/core/profile';
import {ChatMessageImageObtainer} from '~/app/core/im/chat-message-image-obtainer';

const chathistoryAPI = {
    Lang,
    chatsStore,
    chatMessagesListStore,
    membersStore,
    deptsStore,
    getContextMenuItems,
    showChatMessageImagePreivew,
    showMediaPreviewWindow,
    openWebviewWindow,
    setActiveChat,
    getFetchingTask,
    openUrlInBrowser,
    socket,
    MainQueryClient,
    onUserConfigChange,
    showChatMessage,
    FilesStoreModule,
    FileDataModule,
    FetchHistoryEventsModule,
    ChatMessagesStoreModule,
    ProfileModule,
    ChatMessageImageObtainer,
};

declare global {
    interface Window {
        chathistoryAPI: typeof chathistoryAPI & {
            currentUser: User;
            cgid: string;
            openUrl: typeof openUrl;
        };
    }
}

/**
 * 显示一个历史记录弹出层或窗体
 * @param cgid 会话 GID
 * @returns 弹出层或新窗口
 */
export const showChatsHistoryWindow = (cgid: string) => {
    if (platform.isBrowser) {
        return showChatsHistoryDialog(cgid, null);
    }

    const name = 'chathistory';
    const currentUser = ProfileModule.getCurrentUser();
    const existWin = getTargetWindow(name);
    if (existWin) {
        existWin.electronAPI.currentWindow.show();
        return;
    }

    const url = generateWindowUrl(WindowType.chathistory, name);
    const features = generateWindowFeatures({
        title: Lang.string('chats.history.title'),
        minWidth: 1000,
        width: 1000,
        minHeight: 600,
        overlayIcon: 'history-win.png',
        vibrancy: 'popover',
    });
    const win = openWindow(url, name, features);
    const mainWindow = getMainWindow();

    exposeInWindow(mainWindow, 'chathistoryAPI', {
        ...chathistoryAPI,
        cgid,
        currentUser,
        openUrl: (url, targetElement, event, context) => {
            mainWindow.electronAPI.currentWindow.show();
            openUrl(url, targetElement, event, context);
        },
    });

    return win;
};
