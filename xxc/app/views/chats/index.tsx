import {memo, useCallback, useMemo} from 'react';
import {Redirect} from 'react-router-dom';
import Config from '~/app/config';
import {classes} from '~/app/utils/html-helper';
import {getActiveChatGid, getChatMenuType} from '~/app/core/im/chat-active-state';
import Menu from './menu';
import ChatsCache from './chats-cache';
import ChatsDndContainer from './chats-dnd-container';
import useWindowSizeType from '~/app/components/hooks/use-window-size-type';
import chatsStore from '~/app/core/im/chats-store';
import debounce from '~/app/utils/debounce';
import {getLocalConfig, setLocalConfig} from '~/app/core/local-config';
import {getCurrentUserID} from '~/app/core/profile';
import {SplitPane} from '~/app/components/split-pane/split-pane';
import type {CacheContainerItemProps} from '../main/cache-container';
import type {ChatMenuType} from '~/app/constants';

/**
 * 尝试在用户点击会话界面时将当前激活的会话标记为已读
 */
const tryMuteActiveChat = debounce(() => {
    const activeChatId = getActiveChatGid();
    if (activeChatId && chatsStore.muteChatUnreadMessages(activeChatId) && DEBUG) {
        console.error('tryMuteActiveChat works', activeChatId);
    }
}, 1000);

const getMenuType = (params: CacheContainerItemProps['match']['params']) => {
    let menuType: ValueOf<typeof ChatMenuType> | undefined;
    if (params.app === 'chats' && params.filterType) {
        menuType = params.filterType as ValueOf<typeof ChatMenuType>;
    }
    if (!menuType) {
        menuType = getChatMenuType();
    }
    return menuType;
};

const getActiveChatID = (params: CacheContainerItemProps['match']['params']) => {
    let activeChatID: string | undefined;
    if (params.app === 'chats' && params.id) {
        activeChatID = params.id;
    }
    if (!activeChatID) {
        activeChatID = getActiveChatGid();
    }
    return activeChatID;
};

/**
 * 会话首页视图组件
 * @param props React 组件属性对象
 * @param props.match 类名
 * @param props.hidden 是否隐藏
 * @param props.className 类名
 * @returns React Node content
 */
function ChatsIndex(props: CacheContainerItemProps) {
    const {hidden = false, match, className} = props;
    const sizeInfo = useWindowSizeType();
    const hideMenu = sizeInfo.isSmall;
    const userID = getCurrentUserID();
    const {params} = match;

    const menuType = getMenuType(params);
    const activeChatID = getActiveChatID(params);

    let redirectView: JSX.Element | null = null;
    if (chatsStore.isReady && (!activeChatID || !chatsStore.getChat(activeChatID))) {
        let latestChat = chatsStore.getLastChatWithUnreadMessages();
        if (!latestChat) {
            [latestChat] = chatsStore.getRecentChats({maxRecentTime: 0}).sort((a, b) => b.lastAccessTime - a.lastAccessTime);
        }
        if (latestChat) {
            redirectView = <Redirect to={`/chats/recents/${latestChat.gid}`} />;
        }
    }

    const splitSizeChange = useCallback((newsize: number) => {
        setLocalConfig(`local.chats.menu.width.${userID}`, newsize);
    }, [userID]);

    const splitSize = getLocalConfig(`local.chats.menu.width.${userID}`) ?? Config.ui['chats.menu.width'];

    const menuView = useMemo(() => {
        if (hideMenu) {
            return null;
        }

        return <Menu className="dock" filterType={menuType} activeChatId={activeChatID} />;
    }, [hideMenu, menuType, activeChatID]);

    return (
        <div className={classes('dock app-chats', className, {hidden})} onClick={tryMuteActiveChat}>
            <SplitPane
                split="vertical"
                maxSize={400}
                minSize={190}
                defaultSize={splitSize}
                className="-h-full -w-full"
                onChange={splitSizeChange}
            >
                {menuView}
                <ChatsCache className="dock" activeChatId={activeChatID}>
                    <ChatsDndContainer className="dock" />
                </ChatsCache>
            </SplitPane>
            {redirectView}
        </div>
    );
}

export default memo(ChatsIndex);
