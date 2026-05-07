import {isActiveChat, getActiveChatGid, setActiveChat, onActiveChat, isOpenedActiveChat} from './chat-active-state';
import DelayAction from '../../utils/delay-action';
import {isMatchWindowCondition, updateNotice, playNoticeSound, requestAttention, type Notice} from '../notice';
import Lang, {onLangChange} from '../lang';
import {getCurrentUser} from '../profile';
import Config from '../../config';
import platform from '../../platform';
import {isRoutePathMatch} from '../ui/router';
import chatsStore from './chats-store';
import {subscribeReceiveNewMessages, subscribeUnreadMessagesChange} from './chat-message-notice';
import {ChatMenuType} from '~/app/constants';

/**
 * 记录最后一个通知信息
 */
let lastNoticeInfo: Notice = {count: 0};

/**
 * 更新聊天通知延迟操作实例
 */
const updateChatNoticeTask = new DelayAction(async () => {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.isOnline) {
        return;
    }

    const isWindowFocus: boolean = platform.call('ui.isWindowFocus');
    const userConfig = currentUser.config;

    // 当会话没有激活时不进行提醒
    const muteOnChatNotActive = Config.ui['chat.muteOnChatNotActive'];

    const count = chatsStore.getUnreadMessageCount((chat) => {
        // 略过被删除、被解散的会话，以及当前窗口拥有焦点且已激活的会话
        if (chat.isDeleted || chat.mute || chat.isDismissed || (isWindowFocus && isOpenedActiveChat(chat.gid))) {
            return false;
        }

        // 支持在 web 嵌入模式下，不对非激活的会话进行提醒
        if (muteOnChatNotActive && !isActiveChat(chat.gid)) {
            return false;
        }

        const {unreadMessagesCount} = chat;
        if (unreadMessagesCount === 0) {
            return false;
        }

        return unreadMessagesCount;
    });

    // 托盘图标
    const tray = {
        label: count ? Lang.format('notification.receviedMessages.format', count) : '',
        flash: count && userConfig.flashTrayIcon && isMatchWindowCondition(userConfig.flashTrayIconCondition)
    };

    // 当前用户信息描述文本
    const userInfo = currentUser && `${currentUser.displayName} [${Lang.string(`member.status.${currentUser.statusName}`)}]`;

    lastNoticeInfo = {
        count,
        tray,
        userInfo,
    };
    updateNotice(lastNoticeInfo);
}, 200);

/**
 * 更新聊天通知
 */
export const updateChatNotice = () => {
    updateChatNoticeTask.do();
};

/**
 * 初始化聊天通知相关功能
 */
export const initIMNotice = () => {
    // 监听收到新消息事件，根据新收到的消息决定是否显示通知
    subscribeReceiveNewMessages(() => {
        const currentUser = getCurrentUser();
        const {config} = currentUser;
        if (
            config.enableSound
            && (!config.muteOnUserIsBusy || !currentUser.isBusy)
            && isMatchWindowCondition(config.playSoundCondition)
        ) {
            playNoticeSound();
        }
        if (!platform.call('ui.isWindowOpen')) {
            requestAttention();
        }
    });

    // 监听会话激活事件
    onActiveChat(cgid => {
        chatsStore.muteChatUnreadMessages(cgid);
    });

    // 监听语言变更事件，更新通知内容为对应语言的消息
    onLangChange(updateChatNotice);

    // 监听未读消息变更事件
    subscribeUnreadMessagesChange(updateChatNotice);

    // 监听界面窗口激活事件
    if (platform.has('ui.onWindowFocus')) {
        const delayTask = new DelayAction(() => {
            if (!isRoutePathMatch('chats')) {
                return;
            }

            const cgid = getActiveChatGid();
            const activeChat = cgid && chatsStore.getChat(cgid, false);
            if (activeChat && (activeChat.hasUnreadMessages || activeChat.fileSavedNoticeCount)) {
                chatsStore.muteChatUnreadMessages(activeChat.gid);
            }
        }, 200);

        platform.call('ui.onWindowFocus', delayTask.do.bind(delayTask));
    }

    // 激活最后一个拥有未读消息的会话
    const activeLastChatWithUnreadMessages = () => {
        if (document.fullscreenElement != null) {
            document.exitFullscreen();
        }
        const lastChatWithUnreadMessages = chatsStore.getLastChatWithUnreadMessages();
        if (lastChatWithUnreadMessages) {
            setActiveChat(lastChatWithUnreadMessages.gid, {menu: ChatMenuType.recents});
        }
    };

    // 在用户点击托盘图标或者从最小化还原窗口时激活最后一个拥有未读消息的会话
    if (window.electronAPI) { // 监听用户点击托盘图标请求打开事件
        const REQUEST_OPEN_FROM_TRAY = platform.access('remoteEvents.REQUEST_OPEN_FROM_TRAY') as 'requestOpenFromTray';
        window.electronAPI.ipcRenderer.on[REQUEST_OPEN_FROM_TRAY](activeLastChatWithUnreadMessages);
    }
};
