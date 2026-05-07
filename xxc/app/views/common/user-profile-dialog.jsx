import {getCurrentUser} from '../../core/profile';
import MemberProfileDialog from './member-profile-dialog';

/**
 * 显示个人资料对话框
 * @param {function} callback 对话框显示回调函数
 * @returns {void}
 */
export const showUserProfileDialog = (callback) => {
    const user = getCurrentUser();
    if (user) {
        return MemberProfileDialog.show(user, callback);
    }
    if (callback) {
        callback(false);
    }
};

export default {
    show: showUserProfileDialog,
};
