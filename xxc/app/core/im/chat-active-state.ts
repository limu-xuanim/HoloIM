import {setRoutePath, isRoutePathMatch, getRoutePathArray, onRoutePathChange} from '../ui/router';
import events from '../events';
import {ChatMenuType} from '~/app/constants';

/**
 * 当前激活的聊天实例 ID
 */
let activeChatGid: string = null;

/**
 * 当前会话菜单类型
 */
let currentMenuType = ChatMenuType.recents;

/**
 * 当前应用类型
 */
let currentAppType: string = null;

/**
 * 会话激活事件
 */
const EVENT_ACTIVE_CHAT = 'chat.active';

/**
 * 当前界面是否是聊天界面
 */
export const isChatsAppActive = (): boolean => currentAppType === 'chats';

/**
 * 当前界面是否已经打开且激活给定会话
 * @param cgid 会话 GID
 * @returns 是否打开并激活
 */
export const isOpenedActiveChat = (cgid: string): boolean => isRoutePathMatch('chats', '*', cgid);

/**
 * 判断给定的聊天是否是当前激活的聊天
 * @param cgid 聊天 GID
 * @returns 如果返回 `true` 则为是当前激活的聊天，否则为不是当前激活的聊天
 */
export const isActiveChat = (cgid: string): boolean => activeChatGid === cgid || isOpenedActiveChat(cgid);

/**
 * 绑定聊天激活事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onActiveChat = (listener: (cgid: string, chatMenu: ValueOf<typeof ChatMenuType>) => void): symbol => events.on(EVENT_ACTIVE_CHAT, listener);

/**
 * 在界面上激活会话
 * @param cgid 会话 GID
 * @param options 选项
 * @param options.menu 要激活的菜单类型
 * @param options.autoScrollBehavior 滚动行为
 * @returns 如果为 true 则激活成功
 */
export const setActiveChat = (cgid: string, options: Partial<{
    menu: ValueOf<typeof ChatMenuType>;
    autoScrollBehavior: string;
}> = {}): boolean => {
    const {menu = currentMenuType, autoScrollBehavior} = options;

    if (!isRoutePathMatch('chats', menu, cgid)) {
        setRoutePath('chats', menu, cgid, autoScrollBehavior ? {autoScrollBehavior} : null);
        return true;
    }
    return false;
};

/**
 * 在界面上激活下一个会话
 * @param options 选项
 * @param options.menu 要激活的菜单类型
 * @param options.lastChatGid 上一个会话 GID
 * @param options.openChatsIfNeed 当不在会话界面时先打开会话界面
 * @param options.onlyLastChatIsActive 仅当上一个会话是当前激活的会话时执行操作
 * @returns 如果为 true 则激活成功
 */
export const activeNextChatOnMenu = (options: Partial<{
    menu: ValueOf<typeof ChatMenuType>;
    lastChatGid: string;
    openChatsIfNeed: boolean;
    onlyLastChatIsActive: boolean;
}> = {}): boolean => {
    const {onlyLastChatIsActive = true, menu = currentMenuType} = options;
    let {lastChatGid} = options;
    if (onlyLastChatIsActive && lastChatGid && !isActiveChat(lastChatGid)) {
        return false;
    }

    if (!isRoutePathMatch('chats')) {
        if (options.openChatsIfNeed) {
            setRoutePath('chats', menu, lastChatGid);
        } else {
            return false;
        }
    }

    const menuList = document.getElementById('appChatsMenuList');
    if (!menuList) {
        return false;
    }
    lastChatGid = lastChatGid || activeChatGid;
    let nextMenuChatItem = null;
    if (lastChatGid) {
        const currentMenuChatItem = menuList.querySelector(`.app-menu-chat-item[data-gid="${lastChatGid}"]`);
        if (currentMenuChatItem) {
            nextMenuChatItem = currentMenuChatItem.previousElementSibling;
            if (!nextMenuChatItem) {
                nextMenuChatItem = currentMenuChatItem.nextElementSibling;
            }
        }
        if (nextMenuChatItem && !nextMenuChatItem.classList.contains('app-menu-chat-item')) {
            nextMenuChatItem = null;
        }
    }
    if (!nextMenuChatItem) {
        nextMenuChatItem = menuList.querySelector('.app-menu-chat-item');
    }
    if (nextMenuChatItem) {
        setRoutePath('chats', menu, nextMenuChatItem.getAttribute('data-gid'));
        return true;
    }
};

/**
 * 获取当前激活对聊天 GID
 * @returns 当前激活对聊天 GID
 */
export const getActiveChatGid = () => activeChatGid;

/**
 * 获取当前激活对聊天菜单类型
 * @returns 当前激活对聊天菜单类型
 */
export const getChatMenuType = () => currentMenuType;

/**
 * 从路由地址设置激活状态
 */
function setActiveStateFromRoutePath() {
    const [appType, menuType, cgid] = getRoutePathArray();

    currentAppType = appType;

    if (appType !== 'chats') {
        return;
    }
    if (menuType) {
        currentMenuType = menuType as ValueOf<typeof ChatMenuType>;
    }
    if (!cgid) {
        return;
    }
    if (activeChatGid !== cgid) {
        activeChatGid = cgid;
        events.emit(EVENT_ACTIVE_CHAT, activeChatGid, currentMenuType);
    }
}

(() => {
    // 监听路由地址变化
    onRoutePathChange(setActiveStateFromRoutePath);

    setActiveStateFromRoutePath();
})();
