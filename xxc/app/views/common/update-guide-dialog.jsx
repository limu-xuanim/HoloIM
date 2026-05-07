import React from 'react';
import Modal from '../../components/modal';
import UpdateGuide from './update-guide';

/**
 * 显示更新升级指引对话框
 * @param {function=} callback 显示完成后的回调函数
 * @returns {void}
 */
export const showUpdateGuideDialog = (callback) => {
    const modalId = 'app-update-guide-dialog';
    return Modal.show({
        id: modalId,
        actions: false,
        closeButton: false,
        modal: true,
        content: <UpdateGuide onRequestClose={() => (Modal.hide(modalId))} />
    }, callback);
};

export default {
    show: showUpdateGuideDialog,
};
