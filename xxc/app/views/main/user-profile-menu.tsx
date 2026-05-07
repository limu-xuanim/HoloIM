import {addContextMenuCreator, showContextMenu} from '~/app/core/context-menu';
import {getCurrentUser} from '~/app/core/profile';
import User from '~/app/core/profile/user';
import Lang from '~/app/core/lang';
import {changeUserStatus, logout} from '~/app/core/server';
import {getUpdaterStatus} from '~/app/core/updater';
import UI from '~/app/core/ui';
import {showUserSettingDialog} from '../common/user-setting-dialog';
import {showUpdateGuideDialog} from '../common/update-guide-dialog';
import {showAboutDialog} from '../common/about-dialog';
import {showLanguageSwitchDialog} from '../common/language-switch-dialog';
import {showUserChangePasswordDialog} from '../common/user-change-password-dialog';
import StatusDot from '../common/status-dot';
import MemberAvatar from '../common/member-avatar';
import {showUserAvatarDialog} from './user-avatar-dialog';
import {getPlatformType} from '~/app/core/ui/browser-window';
import {PlatformType} from '~/app/constants';
import type {MemberStatusName} from '~/app/core/members/member';

const createViewProfileItem = (user: User) => ({
    id: 'viewProfile',
    className: 'app-user-profile-menu-name',
    icon: <MemberAvatar memberID={user.id} size={30} />,
    label: (
        <div className="content">
            <div className="title strong">{user.displayName}</div>
            <div className="subtitle">{user.account}</div>
        </div>
    ),
    url: `xxc://showMemberProfile/${user.id}`,
});

const createSwitchStatusItem = (statusName: MemberStatusName, userStatusName: MemberStatusName|'') => ({
    id: `switchStatus-${statusName}`,
    icon: <StatusDot status={statusName} />,
    label: Lang.string(`member.status.${statusName}`),
    checked: userStatusName === statusName,
    click: () => changeUserStatus(statusName)
});

const createChangeAvatarItem = () => ({
    id: 'changeAvatar',
    label: Lang.string('usermenu.changeAvatar'),
    click: () => {
        showUserAvatarDialog();
    }
});

const createChangePasswordItem = () => ({
    id: 'changePassword',
    label: Lang.string('usermenu.changePassword'),
    click: showUserChangePasswordDialog
});

const createSwitchLanguageItem = () => ({
    id: 'switchLanguage',
    label: Lang.string('common.switchLanguage'),
    click: showLanguageSwitchDialog
});

const createSettingItem = () => ({
    id: 'setting',
    label: Lang.string('usermenu.setting'),
    click: showUserSettingDialog
});

const createAboutItem = () => ({
    id: 'about',
    label: Lang.string('usermenu.about'),
    click: showAboutDialog
});

const createFoundNewVersionItem = () => ({
    id: 'foundNewVersion',
    label: Lang.string('update.foundNewVersion'),
    click: showUpdateGuideDialog
});

const createLogoutItem = () => ({
    id: 'logout',
    label: Lang.string('usermenu.logout'),
    click: async () => {
        logout();
    }
});

const createExitItem = () => ({
    id: 'exit',
    label: Lang.string('usermenu.exit'),
    click: UI.quit
});

// 注册上下文菜单：用户个人资料菜单
addContextMenuCreator('profile.menu', () => {
    const user = getCurrentUser();
    const items = [];
    const userStatus = user?.status;
    const userStatusName = userStatus && User.STATUS.getName(userStatus);

    items.push(createViewProfileItem(user));

    items.push('divider');

    const statusNames = [
        User.STATUS.getName(User.STATUS.$.online),
        User.STATUS.getName(User.STATUS.$.busy),
        User.STATUS.getName(User.STATUS.$.away),
    ];

    items.push(...statusNames.map(name => createSwitchStatusItem(name, userStatusName)));

    items.push('divider');

    if (user.backendType === 'xxb' && getPlatformType() === PlatformType.electron) {
        items.push(createChangeAvatarItem());
    }

    items.push(createChangePasswordItem());

    items.push(createSwitchLanguageItem());
    items.push(createSettingItem());

    items.push('divider');

    items.push(createAboutItem());

    const updaterStatus = getUpdaterStatus();
    if (updaterStatus.needUpdate) {
        items.push(createFoundNewVersionItem());
    }

    items.push('divider');
    items.push(createLogoutItem());

    if (UI.canQuit) {
        items.push(createExitItem());
    }

    return items;
}, {apiLevel: 4});

/**
 * 显示用户个人资料菜单
 * @param event 菜单显示位置
 */
export default (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    const position = {
        triggerElement: event.currentTarget || event.target,
        direction: 'below-left',
        offsetX: -45,
        offsetY: 5,
    };
    showContextMenu('profile.menu', {event, options: {position, className: 'app-user-profile-menu', style: {minWidth: 188}}});
};
