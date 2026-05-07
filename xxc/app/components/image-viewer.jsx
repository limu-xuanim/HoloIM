import React from 'react';
import Modal from './modal';
import fuid from '../utils/fuid';
import AdvancedImageViewer from './advanced-image-viewer';

/** @module image-viewer */

/**
 * 显示一个图片预览弹出层或窗体
 * @param {string} imageSrc 图片地址
 * @param {Object} props DisplayLayer 组件属性
 * @param {?Function} callback 操作完成时的回调函数
 * @returns {DisplayLayer|NativeWindowChannel} 弹出层或新窗口
 * @function
 */
export const showImageViewer = (imageSrc, props, callback) => {
    const modalId = fuid();
    return Modal.show({
        closeButton: true,
        actions: false,
        className: 'layer-image-viewer dock clean',
        onClick: () => {
            Modal.hide(modalId);
        },
        content: <AdvancedImageViewer src={imageSrc} onRequestClose={() => Modal.hide(modalId)} />,
        ...props,
        id: modalId
    }, callback);
};

export default {
    show: showImageViewer,
};
