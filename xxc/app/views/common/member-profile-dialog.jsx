import React from 'react';
import Modal from '../../components/modal';
import {getMenuItemsForContext} from '../../core/context-menu';
import {renderIcon} from '../../components/icon';
import {classes} from '../../utils/html-helper';

/**
 * 显示成员个人资料对话框
 * @param {number|{id: number}} memberId 成员 ID 或成员对象
 * @param {function=} callback 对话框显示完成时的回调函数
 * @returns {void}
 */
export const showMemberProfileDialog = (memberId, callback) => {
    if (typeof memberId === 'object') {
        memberId = memberId.id;
    }
    const modalId = `member-${memberId}`;
    const profileContent = getMenuItemsForContext('member.profile', {params: [memberId]}).map((item) => {
        if (React.isValidElement(item)) {
            return item;
        }
        const {
            className: thisItemClassName,
            icon,
            label,
        } = item;
        const iconView = icon && renderIcon(icon, {className: 'item-left-icon'});
        let labelView = null;
        if (React.isValidElement(label)) {
            labelView = label;
        } else if (label) {
            labelView = <span className="title">{label}</span>;
        }

        return (
            <a key={item.label} className={classes('item', thisItemClassName)}>
                {iconView}
                {labelView}
            </a>
        );
    });
    return Modal.show({
        actions: false,
        id: modalId,
        headingClassName: 'dock-right dock-top',
        className: 'contextmenu-member_profile',
        content: <div className="list dropdown-menu has-icon-left">{profileContent}</div>
    }, callback);
};

export default {
    show: showMemberProfileDialog,
};
