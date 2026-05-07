import Lang from '../../core/lang';
import {createGroupChat} from '../../core/im/im-ui';
import {setActiveChat} from '../../core/im/chat-active-state';
import {inviteMembersToChat} from '../../core/im/im-server';
import Messager from '../../components/messager';
import {showMembersSelectDialog} from '../common/members-select-dialog';
import chatsStore from '../../core/im/chats-store';

/**
 * 显示一个对话框，允许用户邀请选择的一些用户加入指定聊天
 * @param {Chat} chat 要邀请
 * @param {number[]} selections 已经选中的用户
 * @param {number[]} excludes 排除的用户
 * @param {boolean} bypassChatStore 让超级管理员请求绕过本地chatStore
 * @param {function} callback 回调函数
 * @returns {void}
 */
export const showChatInviteDialog = async (chat, selections = [], excludes = [], bypassChatStore = false, callback = null) => {
    if (!bypassChatStore && typeof chat === 'string') {
        chat = chatsStore.getChat(chat);
    }
    if (!chat) {
        return;
    }
    const chatMembers = Array.from(chat.members);
    const selectedMembers = await showMembersSelectDialog({
        selections,
        selectTip: Lang.string('chat.invite.selectMembers'),
        excludes: [...chatMembers, ...excludes],
        scopes: ['depts'],
    }, callback);

    if (selectedMembers?.length) {
        try {
            if (!bypassChatStore && chat.isOne2One) {
                // 如果是一对一聊天则创建一个新的分组
                selectedMembers.push(...chatMembers);
                const newChat = await createGroupChat(selectedMembers);
                setActiveChat(newChat.gid);
                return newChat;
            }
            // 直接将选择的用户邀请到已有的聊天
            await inviteMembersToChat(chat, selectedMembers);
            return chat;
        } catch (error) {
            if (error) {
                Messager.show(Lang.error(error), {type: 'danger'});
            }
        }
    }
};

export default {
    show: showChatInviteDialog,
};
