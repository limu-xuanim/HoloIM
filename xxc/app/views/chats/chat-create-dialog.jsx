import Lang from '../../core/lang';
import {setActiveChat} from '../../core/im/chat-active-state';
import {getOne2OneChatGid} from '../../core/im/chat-helper';
import Messager from '../../components/messager';
import {getCurrentUserID} from '../../core/profile';
import {showChatCreateGroupsDialog} from './chat-create-groups-dialog';
import {showMembersSelectDialog} from '../common/members-select-dialog';

/**
 * 显示创建聊天对话框
 * @param {number[]=} selections 已经选中的用户
 * @param {function=} callback 显示完成后的回调函数
 * @returns {void}
 */
export const showCreateChatDialog = async (selections, callback) => {
    const selectedMembers = await showMembersSelectDialog({
        selections,
        excludes: [getCurrentUserID()],
        scopes: ['depts'],
    }, callback);
    if (selectedMembers && selectedMembers.length > 0) {
        if (selectedMembers.length === 1) {
            setActiveChat(getOne2OneChatGid(...selectedMembers));
        } else {
            try {
                await showChatCreateGroupsDialog(selectedMembers);
            } catch (error) {
                Messager.show(Lang.error(error), {type: 'danger'});
            }
        }
    }
};

export default {
    show: showCreateChatDialog,
};
