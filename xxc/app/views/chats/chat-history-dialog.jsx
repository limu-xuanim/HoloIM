import React from 'react';
import {showModal} from '../../components/modal';
import ChatMessageContext from './chat-message-context';

/**
 * 显示聊天历史记录对话框界面
 * @param {string} cgid 聊天 GID
 * @param {number} messageID 消息 ID
 * @param {function} callback 回调函数
 * @returns {void}
 */
export const showChatHistoryDialog = (cgid, messageID, callback) => {
    // 兼容传入会话对象对情况
    if (cgid && typeof cgid === 'object') {
        cgid = cgid.gid;
    }
    const modalId = 'app-chat-history-dialog';
    return showModal({
        id: modalId,
        style: {
            left: 10,
            right: 10,
            bottom: 0,
            top: 20
        },
        className: 'app-chat-history-dialog dock primary-pale',
        animation: 'enter-from-bottom',
        actions: false,
        content: <ChatMessageContext
            className="-flex-auto"
            messageID={+messageID}
            cgid={cgid}
            style={{maxHeight: '100%'}}
            showScrollButton
        />
    }, callback);
};

export default {
    show: showChatHistoryDialog,
};
