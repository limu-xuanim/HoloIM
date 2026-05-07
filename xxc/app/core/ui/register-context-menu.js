import platform from '../../platform';
import {addContextMenuCreator, showContextMenu} from '../context-menu';
import {registerCommand, executeCommand} from '../commander';
import Lang from '../lang';

/**
 * 平台提供的通用界面交互访问对象
 * @type {Object}
 * @private
 */
const platformUI = platform.access('ui');

// 添加成员上下文菜单生成器
addContextMenuCreator('member', ({member}) => [{
    id: 'member-profile',
    label: Lang.string('member.profile.view'),
    click: () => {
        executeCommand('showMemberProfile', member);
    }
}], {apiLevel: 5});

// 添加登录界面设置按钮菜单
addContextMenuCreator('login.setting', ({
    logging,
    showServerInput,
    showAbout,
    onRequestShowServerInput
}) => {
    const isOpenAtLogin = platform.access('ui.isOpenAtLogin');
    return [
        isOpenAtLogin && {
            id: 'open-at-login',
            label: Lang.string('login.openAtLogin'),
            checked: isOpenAtLogin(),
            click: async () => {
                const prevOpenAtLogin = isOpenAtLogin();
                await platformUI.setOpenAtLogin(!prevOpenAtLogin);
                if (prevOpenAtLogin === isOpenAtLogin()) {
                    executeCommand('showMessager', Lang.string('login.openAtLogin.failure'), {
                        type: 'danger',
                        icon: 'alert',
                    });
                }
            }
        },
        !showServerInput && {
            id: 'show-server-setting',
            label: Lang.string('login.showServerSetting'),
            click: onRequestShowServerInput
        }
    ];
});

// 注册显示上下文菜单命令
registerCommand('showContextMenu', (context, name, ...params) => {
    const {options, event} = context;
    showContextMenu(name, {options, event, params});
});
