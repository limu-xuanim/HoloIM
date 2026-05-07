import chatsStore from '~/app/core/im/chats-store';
import {showMembersSelectDialog} from '../common/members-select-dialog';
import {getCurrentUserID} from '~/app/core/profile';

/**
 * 显示会话成员选择对话框
 * @param cgid 会话 GID
 * @param options 选项
 * @param options.id 窗口id
 * @param options.selections 已经选中的用户 ID 列表
 * @param options.excludes 排除的用户 ID 列表
 * @param options.selectTip 选择用户时的提示
 * @param callback 显示完成后的回调函数
 * @returns 使用 Promise 返回结果
 */
export const showChatMembersSelectDialog = (
    cgid: string,
    options: {
        id?: string;
        selections?: number[];
        excludes?: number[];
        selectTip?: string;
        rejectWhenCancel?: boolean;
    },
    callback?: () => void
): Promise<number[]> => {
    const {selections = [], excludes = [], selectTip, id, rejectWhenCancel} = options;
    if (!excludes.length) {
        excludes.push(getCurrentUserID());
    }

    // 取消输入框选区，防止重复弹出@建议框
    const newCallback = () => {
        document.getSelection().removeAllRanges();
        if (typeof callback === 'function') {
            callback();
        }
    };

    const chat = chatsStore.getChat(cgid, true);
    return showMembersSelectDialog({
        selections,
        excludes,
        selectTip,
        id,
        scopes: chat.isSystem ? ['depts'] : ['groups', 'depts'],
        rejectWhenCancel,
        cgid,
    }, newCallback);
};
