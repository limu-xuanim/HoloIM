import React from 'react';
import Modal from '../../components/modal';
import ChatCreateGroupsInfo from './chat-create-groups-info';
import {createChatWithMembers} from '../../core/im/im-server';
import Messager from '../../components/messager';
import Lang from '../../core/lang';
import {setActiveChat} from '../../core/im/chat-active-state';

/**
 * 显示创建讨论组对话框
 * @param {Member[]} selectedMembers 要创建的讨论组成员列表
 * @param {function} callback 显示完成后的回调函数
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const showChatCreateGroupsDialog = (selectedMembers, callback) => new Promise((resolve, reject) => {
    const modalId = 'app-chat-create-groups-dialog';
    const onRequestClose = (newChatInfo) => {
        if (newChatInfo?.name) {
            newChatInfo.name = newChatInfo.name.trim();
            createChatWithMembers(selectedMembers, newChatInfo).then(newChat => {
                setActiveChat(newChat.gid);
                resolve(newChat);
                return newChat;
            }).catch(reject);
        } else {
            resolve();
        }
        Modal.hide(modalId);
    };
    Modal.show({
        id: modalId,
        className: 'app-chat-create-groups-dialog',
        content: <ChatCreateGroupsInfo onRequestClose={onRequestClose} />,
        actions: false,
        closeButton: false,
    }, callback);
}).catch(error => {
    if (error) {
        Messager.show(Lang.error(error), {type: 'danger'});
    }
});

export default {
    show: showChatCreateGroupsDialog,
};
