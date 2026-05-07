import React from 'react';
import Modal from '../../components/modal';
import LanguageSwitcher from './language-switcher';
import {registerCommand} from '../../core/commander';

/**
 * 显示语言切换对话框
 * @param {function} callback 对话框显示完成时的回调函数
 * @returns {void}
 */
export const showLanguageSwitchDialog = (callback) => Modal.show({
    headingClassName: 'dock dock-right dock-top',
    content: <LanguageSwitcher />,
    actions: false
}, callback);

registerCommand('showLanguageSwitchDialog', () => showLanguageSwitchDialog(), null, {apiLevel: 4});

export default {
    show: showLanguageSwitchDialog,
};
