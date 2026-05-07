import Lang from '~/app/core/lang';
import Messager from '~/app/components/messager';
import {shareContentToChats} from '~/app/core/im/im-server';
import {showChatsSelectDialog} from './chats-select-dialog';
import chatsStore from '~/app/core/im/chats-store';
import type Chat from '~/app/core/im/chat';
import type ChatMessage from '~/app/core/im/chat-message';

/**
 * 显示分享转发对话框界面
 * @param shareContentOrDoShareAction 要分享的内容或选择内容后执行分享操作的回调函数
 * @param callback 回调函数
 */
export const showChatShareDialog = async (
    shareContentOrDoShareAction:
        | ChatMessage
        | ChatMessage[]
        | string
        | string[]
        | ((chats: Chat[] | null) => void),
    callback?: (gids: string[] | null) => void,
) => {
    const gids = await showChatsSelectDialog({
        selectTip: Lang.string('chat.share.selectChats'),
    }, callback);
    const chatsRaw = gids?.length ? chatsStore.getChats(gids) : null;
    const chats = chatsRaw?.filter((c): c is Chat => !!c) ?? null;

    if (typeof shareContentOrDoShareAction === 'function') {
        shareContentOrDoShareAction(chats);
        return;
    }

    if (!chats?.length) {
        return;
    }

    const chatMessages = await shareContentToChats(shareContentOrDoShareAction, chats, 'chat.share.sending');

    if (chatMessages.length) {
        Messager.show(Lang.format('chat.share.sendSuccess', chats.length), {
            type: 'success',
            autoHide: 3000,
            id: 'messager-chat-share-message',
            closeButton: true,
            backdrop: false,
            modal: false,
        });
    }
};
