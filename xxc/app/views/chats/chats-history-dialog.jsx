import React from 'react';
import {showModal} from '~/app/components/modal';
import ChatsHistory from './chats-history';

/**
 * 显示聊天历史记录对话框界面
 * @param {string} cgid 聊天 GID
 * @param {function} callback 回调函数
 * @returns {void}
 */
export const showChatsHistoryDialog = (cgid, callback) => {
    // 兼容传入会话对象对情况
    if (cgid && typeof cgid === 'object') {
        cgid = cgid.gid;
    }
    const modalId = 'app-chats-history-dialog';
    return showModal({
        id: modalId,
        style: {
            left: 10,
            right: 10,
            bottom: 0,
            top: 20
        },
        className: 'app-chats-history-dialog dock primary-pale',
        animation: 'enter-from-bottom',
        actions: false,
        content: <ChatsHistory cgid={cgid} />
    }, callback);
};

export default {
    show: showChatsHistoryDialog,
};
