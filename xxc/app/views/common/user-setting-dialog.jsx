import React from 'react';
import Modal from '~/app/components/modal';
import Lang from '~/app/core/lang';
import UserSetting from './user-setting';
import {setLocalConfig, getAllLocalConfig} from '~/app/core/local-config';
import {disableGlobalShortcut, enableGlobalShortcut} from '~/app/core/ui/shortcut';
import {getAllUserConfig} from '~/app/core/profile';
import {applyZoomFactor} from '~/app/core/ui';

/**
 * 显示个人设置对话框
 * @param {function} callback 对话框显示回调函数
 * @returns {void}
 */
export const showUserSettingDialog = (callback) => {
    /** @type {UserSetting} */
    let userSetting = null;
    disableGlobalShortcut();
    return Modal.show({
        title: Lang.string('common.setting'),
        id: 'app-user-setting-dialog',
        className: '-pt-1 -pr-1',
        actions: [
            {
                type: 'submit',
                label: Lang.string('common.save'),
                click: () => {
                    if (!userSetting) {
                        return;
                    }

                    const userSettings = userSetting.getSettings();
                    const localSettings = {
                        'local.ui.zoomFactor': userSettings['local.ui.zoomFactor']
                    };
                    for (const key of Object.keys(localSettings)) {
                        if (key in userSettings) {
                            delete userSettings[key];
                        }

                    }
                    getAllUserConfig().set(userSettings);
                    setLocalConfig(localSettings);
                    applyZoomFactor(localSettings['local.ui.zoomFactor']);
                }
            }, {
                type: 'cancel',
                order: 8000,
            }
        ],
        onHidden: enableGlobalShortcut,
        content: <UserSetting
            ref={e => {
                userSetting = e;
            }}
            settings={getAllUserConfig().plain()}
            localSettings={getAllLocalConfig()}
        />
    }, callback);
};

export default {
    show: showUserSettingDialog,
};
