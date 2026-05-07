import Lang from '../../core/lang';
import {mentionMemberInSendbox} from '../../core/im/im-ui';
import {showChatMembersSelectDialog} from './chat-members-select-dialog';

/**
 * 显示创建聊天对话框
 * @param {string} cgid 已经选中的用户
 * @param {Function} callback 显示完成后的回调函数
 * @returns {void}
 */
export const showChatMentionsDialog = async (cgid, callback) => {
    const selectedMembers = await showChatMembersSelectDialog(cgid, {
        selectTip: Lang.string('chat.selectMentions')
    }, callback);
    if (selectedMembers && selectedMembers.length > 0) {
        mentionMemberInSendbox(selectedMembers, {cgid});
    }
};

export default {
    show: showChatMentionsDialog,
};
