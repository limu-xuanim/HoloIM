import React from 'react';
import Modal from '../../components/modal';
import ChatCommittersSetting from './chat-committers-setting';
import Lang from '../../core/lang';

/**
 * 显示设置聊天白名单对话框
 * @param {Chat} chat 聊天实例
 * @param {function} doSetCommitters 执行设置操作
 * @param {function} callback 显示完成后的回调函数
 * @returns {void}
 */
export const showChatCommittersSettingDialog = (chat, doSetCommitters, callback) => {
    let settingView = null;
    return Modal.show({
        title: Lang.format('chat.committers.setCommittersFormat', chat.name),
        style: {
            width: '80%'
        },
        onSubmit: () => {
            if (settingView && doSetCommitters) {
                doSetCommitters(chat, settingView.getCommitters());
            }
        },
        content: <ChatCommittersSetting ref={e => {settingView = e;}} chat={chat} />
    }, callback);
};

export default {
    show: showChatCommittersSettingDialog,
};
