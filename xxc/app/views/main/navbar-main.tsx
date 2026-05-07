import {memo, useCallback, useContext, useEffect} from 'react';
import {onUserLogin, onUserLogout} from '~/app/core/profile';
import useForceUpdate from '~/app/components/hooks/use-force-update';
import useUnreadMessagesCount from '../chats/use-unread-messages-count';
import NavbarItem from './navbar-item';
import chatsStore from '~/app/core/im/chats-store';
import {NavbarActiveIDContext} from '.';
import useLang from '../common/use-lang';

/**
 * 主导航条组件
 * @returns JSX.Element
 */
function NavbarMain() {
    const unreadMessagesCount = useUnreadMessagesCount();
    const {finalNavbarActiveID: activeID} = useContext(NavbarActiveIDContext);
    const {forceUpdate} = useForceUpdate();
    const [Lang] = useLang();

    useEffect(() => {
        document.body.setAttribute('data-nav-id', activeID);
        document.body.setAttribute('data-nav-hash', location.hash);
        return () => {
            document.body.removeAttribute('data-nav-id');
            document.body.removeAttribute('data-nav-hash');
        };
    }, [activeID]);

    useEffect(() => {
        const loginSubscription = onUserLogin(forceUpdate);
        const logoutSubscription = onUserLogout(forceUpdate);
        return () => {
            loginSubscription.unsubscribe();
            logoutSubscription.unsubscribe();
        };
    }, [forceUpdate]);

    /**
     * 创建主导航上的菜单条目
     * @param unreadMessagesCount 选项
     * @returns 菜单条目列表
     */
    const createMainNavbarItems = useCallback((unreadMessagesCount: number) => {
        const items = [{
            id: 'chats',
            label: Lang.string('navbar.chats.label'),
            icon: 'sprite-nav-chat',
            onClick: () => {
                if (unreadMessagesCount <= 0) {
                    return '/chats';
                }
                const latestChat = chatsStore.getLastChatWithUnreadMessages();
                if (!latestChat) {
                    return '/chats';
                }
                return `/chats/recents/${latestChat.gid}`;
            },
            noticeCount: unreadMessagesCount,
            className: 'app-nav-chats',
        }, {
            id: 'contacts',
            label: Lang.string('navbar.contacts.label'),
            icon: 'sprite-nav-contact',
            onClick: () => '/contacts',
        }];

        return items;
    }, [Lang.string]);

    return (
        <nav className="app-nav-main -flex -flex-col -flex-none -items-center">
            {
                createMainNavbarItems(unreadMessagesCount).map(item => (
                    <NavbarItem
                        key={item.id}
                        active={item.id === activeID}
                        {...item}
                        app="xuan"
                        menu={item.id}
                    />
                ))
            }
        </nav>
    );
}

export default memo(NavbarMain);
