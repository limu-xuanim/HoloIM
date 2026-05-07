import {memo, useEffect, useState} from 'react';
import LoginIndex from '../login';
import MainIndex from '../main';
import useUserVerified from '../common/use-user-verified';
import chatsStore from '~/app/core/im/chats-store';
import {classes} from '~/app/utils/html-helper';
import {getPlatformType, getOSType} from '~/app/core/ui/browser-window';

/**
 * 显示喧喧主应用界面
 * @returns JSX.Element
 */
function AppView() {
    const verified = useUserVerified();
    const [chatsStoreReady, setChatsStoreReady] = useState(false);
    const hideLogin = verified && chatsStoreReady;
    const logging = verified && !chatsStoreReady;

    useEffect(() => {
        document.body.classList.toggle('app-login-showed', !hideLogin);

        if (window.electronAPI) {
            if (hideLogin) {
                window.electronAPI.currentWindow.setNormalSize();
            } else {
                window.electronAPI.currentWindow.setSmallSize();
            }
        }
    }, [hideLogin]);

    useEffect(() => {
        // 为 `<body>` 添加操作平台辅助类，例如 `'platform-browser'` 或 `'platform-electron'`
        document.body.classList.add(`platform-${getPlatformType()}`);

        // 为 `<body>` 添加操作系统辅助类，例如 `'os-mac'` 或 `'os-win'`
        document.body.classList.add(`os-${getOSType()}`);
    }, [])

    useEffect(() => {
        const handler = chatsStore.subscribeChatsReadyEvent(() => {
            setChatsStoreReady(true);
        });

        return () => {
            chatsStore.unsubscribeChatsReadyEvent(handler);
        };
    }, []);

    return (
        <div id="app-view" className={classes('affix', { 'hide-login': hideLogin })}>
            <LoginIndex className="dock-left" hidden={hideLogin} logging={logging} />
            <MainIndex className="normal-transition -absolute -inset-0 -z-[1030] -translate-x-0 -translate-y-0" />
        </div>
    );
}

export default memo(AppView);
