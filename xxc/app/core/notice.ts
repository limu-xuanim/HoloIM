import events from './events';
import Lang from './lang';
import Config from '../config';
import platform from '../platform';
import {isRoutePathMatch} from './ui/router';

/** 平台提供的通知功能访问对象 */
const notify = platform.access('notify');

/** 平台提供的通用界面交互访问对象 */
const PlatformUI = platform.access('ui');

/** 事件名称表 */
const EVENT = {
    update: 'notice.update',
};

export type Notice = Partial<{
    count: number;
    sound: string;
    tray: Partial<{
        flash: boolean;
        text: string;
        label: string;
    }>;
    userInfo: string;
}>;

/** 当前通知 */
let currentNotice: Notice | null = null;

/**
 * 播放通知声音提醒
 * @param sound 声音类型
 */
export function playNoticeSound(sound = 'message') {
    if (notify.playSound && sound) {
        notify.playSound(sound);
    }
}

/**
 * 更新通知信息
 * @param info 通知信息对象
 * @param info.count 未读通知总数
 * @param info.sound 指定需要播放声音的名称
 * @param info.tray 托盘图标更新信息
 * @param info.userInfo 当前用户信息描述文本
 */
export const updateNotice = (info: Notice = {}) => {
    if (info.sound) {
        playNoticeSound(info.sound);
    }

    const noticeCountLabel = info.count ? `${info.count > 99 ? '99+' : info.count}` : '';
    notify.setBadgeLabel?.(noticeCountLabel);

    if (notify.updateTrayIcon) {
        let trayTitlePrefix = Lang.string('app.title', Config.pkg.displayName);
        if (info.userInfo) {
            trayTitlePrefix = `${trayTitlePrefix} - ${info.userInfo}`;
        }
        if (info.tray) {
            const trayText = info.tray.text || noticeCountLabel;
            const trayLabel = info.tray.label ? `${trayTitlePrefix} - ${info.tray.label}` : trayTitlePrefix;
            notify.updateTrayIcon(trayLabel, info.tray.flash, trayText);
        } else {
            notify.updateTrayIcon(trayTitlePrefix);
        }
    }

    currentNotice = info;
    events.emit(EVENT.update, info);
};

/**
 * 判定当前桌面应用是否处于给定条件中描述的状态
 * 所有可用的条件状态包括：
 * - `onWindowHide`：当前应用窗口已经被隐藏
 * - `onWindowBlur`：当前应用窗口已经失去焦点
 * @param condition 条件名称
 * @returns 如果为 `true`，表示符合当前条件
 */
export const isMatchWindowCondition = (condition: string|boolean): boolean => {
    if (condition === true) {
        return true;
    }
    if (condition === 'onWindowHide') {
        return !PlatformUI.isWindowOpen();
    }
    if (condition === 'onWindowBlur') {
        return !PlatformUI.isWindowOpenAndFocus() || !isRoutePathMatch('chats');
    }
    return condition !== false;
};

/**
 * 绑定通知变更事件
 * @param listener 事件回调函数
 * @returns 事件 ID
 */
export const onNoticeUpdate = (listener: (info: Notice) => void): symbol => (events.on(EVENT.update, listener));

/**
 * 获取当前通知信息对象
 */
export const getCurrentNotice = () => currentNotice;

/**
 * 在桌面端请求用户注意
 * @param {false|'normal'|'critical'|'informational'} [attention='normal'] 请求类型
 * @see https://www.electronjs.org/docs/api/dock#dockbouncetype-macos
 */

export const requestAttention = notify.requestAttention || (() => {});

/**
* 更新托盘图标上的用户信息
* @param user 用户对象
*/
export const updateUserInfoOnTray = (user: User) => {
    updateNotice({
        userInfo: (user?.isVerified)
            ? `${user.displayName} [${Lang.string(`member.status.${user.statusName}`)}]`
            : ''
    });
};

export default {
    playSound: playNoticeSound,
    update: updateNotice,
    onNoticeUpdate,
    isMatchWindowCondition,
    requestAttention,
    updateUserInfoOnTray
};
