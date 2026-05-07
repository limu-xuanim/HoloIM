import React from 'react';
import Modal from '../../components/modal';
import MessageView from './message-view';

/**
 * 显示消息查看对话框
 * @param {number|ChatMessage} message 消息对象或消息 ID
 * @param {string} cgid 消息所属会话 GID
 * @param {function} [callback] 对话框显示完成回调函数
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export function showMessageInDialog(message, cgid, callback) {
    return Modal.show({
        className: 'app-chat-message-view-dialog',
        content: <MessageView className="space" message={message} cgid={cgid} />,
        actions: false,
        style: {minWidth: 400},
    }, callback);
}
