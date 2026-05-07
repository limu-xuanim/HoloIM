import Config from '~/app/config';
import Modal from '~/app/components/modal';
import {displayHide} from '~/app/components/display';
import {getSearchParam} from '~/app/utils/html-helper';
import Lang, {onLangChange} from '../lang';
import {requestAttention, getCurrentNotice, onNoticeUpdate} from '../notice';
import Store from '~/app/utils/store';
import {executeCommand, registerCommand} from '../commander';
import delay from '~/app/utils/delay';
import platform from '~/app/platform';
import {getCurrentUser, onUserLogin, onUserLogout, getAllUserConfig, isUserOnline, onUserAutoLogin} from '../profile';
import socket from '../server/socket';
import {login, logout, reconnect} from '../server';
import {isGlobalShortcutAvailable, unregisterGlobalShortcut, registerShortcut} from './shortcut';
import {getLocalConfig} from '../local-config';
import './browser-window';
import './register-commands';
import './register-context-menu';
import '../files/files-ui';
import type {ElectronPlatform} from '~/app/platform/electron';
import {Subject} from 'rxjs';
import {onUserConfigRequestUpload, onUserConfigChange} from '../profile/user';

/**
 * 平台提供的通用界面交互访问对象
 */
const platformUI = platform.access<ElectronPlatform['ui']>('ui');

const uiReadySubject = new Subject<void>();

/**
 * 应用缩放比率
 * @param zoomFactor 缩放比率
 */
export const applyZoomFactor = (zoomFactor?: number | `${number}`) => {
    if (!platformUI.setZoomFactor) {
        return;
    }

    if (zoomFactor) {
        return platformUI.setZoomFactor(Number(zoomFactor));
    }

    const zoomFactorConfig = getLocalConfig('local.ui.zoomFactor');
    if (zoomFactorConfig) {
        platformUI.setZoomFactor(Number(zoomFactorConfig));
    }
};

applyZoomFactor();

// 监听应用窗口最小化事件
if (platformUI.onWindowMinimize) {
    platformUI.onWindowMinimize(() => {
        const userConfig = getAllUserConfig();
        if (userConfig?.removeFromTaskbarOnHide) {
            platformUI.setShowInTaskbar(false);
        }
    });
}

// 监听应用窗口失去焦点事件
if (platformUI.onWindowBlur && platformUI.hideWindow) {
    platformUI.onWindowBlur(() => {
        const userConfig = getAllUserConfig();
        if (userConfig?.hideWindowOnBlur) {
            platformUI.hideWindow();
        }
    });
}

// 处理用户登录事件
onUserLogin(([user, loginError, simple]) => {
    if (!simple && Config.ui.showDailySignMessage && !loginError && user.isFirstSignedToday) {
        executeCommand('showMessager', Lang.string('login.signed'), {
            type: 'success',
            icon: 'calendar-check',
            autoHide: true,
        });
    }

    // 将已登录的用户记录下来
    if (!loginError) {
        const loginedUsers = Store.get('loginedUsers') ?? {};
        const {identify} = user;
        if (!loginedUsers[identify]) {
            loginedUsers[identify] = process.env.WIN_NAME;
            Store.set('loginedUsers', loginedUsers);
        }
    }
});

// 处理用户退出登录事件
onUserLogout(([user, _code, reason]) => {
    if (!user) {
        return;
    }

    if (reason?.startsWith('USER_KICKOFF')) {
        displayHide();
        executeCommand('showMessager', Lang.error(reason), {
            rootClassName: 'message-kickoff-confirm',
            type: 'danger',
            icon: 'alert',
            actions: (reason === 'USER_KICKOFF_3' || reason === 'USER_KICKOFF_4') ? [] : [{
                label: Lang.string('login.retry'),
                click: () => {
                    login(user);
                }
            }]
        });

        requestAttention('critical');
    }

    // 仅在DEBUG模式下生效保持当前登录窗口最后登录用户信息逻辑
    if (process.env.HOT) {
        const loginedUsers = Store.get('loginedUsers') ?? {};
        const {identify} = user;
        if (loginedUsers[identify]) {
            delete loginedUsers[identify];
            Store.set('loginedUsers', loginedUsers);
        }
    }
});

if (platform.isElectron && platformUI.isFirstMainWindow()) {
    // 处理打开窗口后自动登录事件
    onUserAutoLogin(result => {
        if (platformUI.isWindowOpenAndFocus()) {
            return;
        }
        const user = getCurrentUser();
        if (!user || result !== 'success' || !user.config.hideWindowOnOpenAtLogin) {
            platformUI.showAndFocusWindow();
        }
    });
}

// 监听网络成功连接事件
window.addEventListener('online', () => {
    if (getCurrentUser() && !socket.isLogging) {
        reconnect().catch(console.error);
    }
});

// 如果平台支持自主处理退出策略则询问用户如何退出
platformUI?.setWindowRequestCloseHandler?.((reason) => {
    if (reason === 'quit') {
        return;
    }
    const user = getCurrentUser();
    if (user && !user.isUnverified) {
        const {appCloseOption} = user.config;
        if (appCloseOption === 'minimize') {
            platformUI.hideWindow();
            return false;
        }
        if (appCloseOption === 'close' || !platformUI.showQuitConfirmDialog) {
            return;
        }
        platformUI.showQuitConfirmDialog({
            message: Lang.string('dialog.appClose.title'),
            rememberText: Lang.string('dialog.appClose.rememberOption'),
            buttons: [
                Lang.string('dialog.appClose.minimizeMainWindow'),
                Lang.string('dialog.appClose.quitApp'),
                Lang.string('dialog.appClose.cancelAction')
            ],
            callback: async (result, checked) => {
                if (checked && result) {
                    user.config.appCloseOption = result;
                }
                if (result === 'close') {
                    platformUI?.hideWindow();
                }
                return result;
            }
        });
        return false;
    }
});

// 设置在窗口被最终关闭前进行注销账号操作
platformUI.setWindowBeforeCloseHandler?.(async () => {
    if (isUserOnline()) {
        await logout();
        await delay(2000);
    }
});

/**
 * 重新加载窗口
 * @returns 使用 Promise 异步返回处理结果
 */
export const reloadWindow = () => Modal.confirm(Lang.string('dialog.reloadWindowConfirmTip'), {title: Lang.string('dialog.reloadWindowConfirm')}).then(confirmed => {
    if (confirmed) {
        logout();
        setTimeout(() => {
            Store.set('autoLoginNextTime', true);
            if (platformUI.reloadWindow) {
                platformUI.reloadWindow();
            } else {
                window.location.reload();
            }
        }, 1000);
    }
    return Promise.resolve(confirmed);
});

/**
 * 判断是否在下次启动自动登录
 * @returns 如果返回 `true` 则为下次启动自动登录，否则为不自动登录
 */
export const isAutoLoginNextTime = () => {
    const autoLoginNextTime = Store.get('autoLoginNextTime');
    if (autoLoginNextTime) {
        Store.remove('autoLoginNextTime');
    }
    return autoLoginNextTime;
};

/**
 * 通过浏览器查询字符串传入的登录参数
 */
export const entryParams = getSearchParam();

/**
 * 触发界面准备就绪事件
 */
export const triggerUIReady = () => {
    uiReadySubject.next();
};

/**
 * 绑定界面准备就绪事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onUIReady = (listener: () => void) => uiReadySubject.subscribe(listener);

/**
 * 设置应用窗口标题
 * @param title 窗口标题
 */
export const setTitle = (title: string) => {
    const platformSetTitle = platformUI.setWindowTitle;
    if (platformSetTitle) {
        platformSetTitle(title);
    } else {
        document.title = title;
    }
};

onUserConfigRequestUpload(changes => {
    if (changes && Object.keys(changes).length) {
        socket.uploadUserSettings(true);
    }
});

/**
 * 自动设置窗口
 */
function autoUpdateTitle() {
    const info = getCurrentNotice();
    const titleParts = [Lang.string('app.title', Config.pkg.displayName)];

    if (info) {
        if (info.userInfo) {
            titleParts.push(`- ${info.userInfo}`);
        }
        if (info.tray?.label) {
            titleParts.push(`- ${info.tray.label}`);
        }
    }
    setTitle(titleParts.join(' '));
}

// 动态更新标题
onLangChange(autoUpdateTitle);
onNoticeUpdate(autoUpdateTitle);

// 处理全局快捷键注册和反注册
if (isGlobalShortcutAvailable()) {
    onUserLogin(([loginUser, loginError]) => {
        if (loginUser.isOnline && !loginError) {
            registerShortcut();
        }
    });
    onUserLogout(unregisterGlobalShortcut);

    if (platformUI.showAndFocusWindow) {
        registerCommand('shortcut.focusWindowHotkey', () => {
            if (platformUI.hideWindow && platformUI.isWindowOpenAndFocus?.()) {
                platformUI.hideWindow();
            } else {
                platformUI.showAndFocusWindow();
            }
        }, null, {apiLevel: 2});
    }

    onUserConfigChange((change) => {
        if (change && Object.keys(change).some(x => x.startsWith('shortcut.'))) {
            registerShortcut();
        }
    });
}

// 当打开第一个主窗口时，清除 loginedUsers 值
if (platform.call('ui.isFirstMainWindow') && !sessionStorage.getItem('lastOpenTime')) {
    Store.set('loginedUsers', {});
    sessionStorage.setItem('lastOpenTime', Date.now().toString());
}

export default {
    entryParams,
    get canQuit() {
        return !!platformUI.confirmToCloseWindow;
    },
    quit: platformUI.confirmToCloseWindow,
    reloadWindow,
    triggerUIReady,
    onUIReady,
    isAutoLoginNextTime,
};
