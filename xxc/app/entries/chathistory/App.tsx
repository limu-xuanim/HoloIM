import {memo} from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import ErrorBoundary from '~/app/components/error-boundary';
import WindowControllsBar from '~/app/components/window-controls-bar';
import {registerCommand} from '~/app/core/commander';
import platform from '~/app/platform';
import type {ElectronPlatform} from '~/app/platform/electron';
import {getWindowStateController, setWindowTitle} from '~/app/platform/electron/window-controller';
import useLang from '~/app/views/common/use-lang';
import ChatsHistory from '~/app/views/chats/chats-history';

const queryClient = window.chathistoryAPI.MainQueryClient;
const cgid = window.chathistoryAPI.cgid;

/**
 * 聊天记录界面
 */
function ChatHistoryApp() {
    const [Lang] = useLang();
    setWindowTitle(Lang.string('chats.history.title'));

    return (
        <QueryClientProvider client={queryClient}>
            <div className="app-chat-history-window">
                <WindowControllsBar
                    controller={getWindowStateController()}
                    title={Lang.string('chats.history.title')}
                />
                <ErrorBoundary>
                    <ChatsHistory cgid={cgid} />
                </ErrorBoundary>
            </div>
        </QueryClientProvider>
    );
}

export default memo(ChatHistoryApp);

/**
 * 平台提供的通用界面交互访问对象
 */
const platformUI = platform.access<ElectronPlatform['ui']>('ui');

// 注册在系统默认浏览器中打开链接命令
registerCommand(
    'openUrlInBrowser',
    (context, url) => {
        if (!url && context.options && context.options.url) {
            ({url} = context.options.url);
        }
        if (url) {
            platformUI.openExternal(url);
            return true;
        }
        return false;
    },
    undefined,
    {apiLevel: 5},
);
