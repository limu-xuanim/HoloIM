import {memo, useEffect} from 'react';
import {classes} from '../../utils/html-helper';
import {Tabs, TabPane} from '../../components/tabs';
import ChatSidebarSystem from './chat-sidebar-system';
import ChatSidebarPeoples from './chat-sidebar-peoples';
import ChatSidebarProfile from './chat-sidebar-profile';
import useLang from '../common/use-lang';

type ChatSidebarProps = {
    chat: Chat;
} & Partial<{
    className: string;
    children: React.ReactNode;
}> & React.HTMLAttributes<HTMLDivElement>;

function ChatSidebar(props: ChatSidebarProps) {
    const {chat, className, children, ...other} = props;
    const [Lang] = useLang();

    useEffect(() => {
        if (PERF) {
            PERF_MARK('chatSidebarShowed', 'beginOpenSystemChatSidebar', 'systemChatSidebarShowTime');
            PERF_MARK('chatSidebarShowed', 'beginOpenOne2oneChatSidebar', 'one2oneChatSidebarShowTime');
        }
    }, []);

    return (
        <div className={classes('app-chat-sidebar dock white', className)} {...other}>
            <Tabs
                className="dock column single"
                defaultActivePaneKey={chat.isOne2One ? 'profile' : chat.isSystem ? 'recentContacts' : 'peoples'}
                navClassName="-overflow-hidden app-chat-sidebar-nav nav-pills -flex-none nav-sm justified shadow-1"
                contentClassName="-flex-auto display -overflow-y-auto scrollbar-hover"
            >
                {
                    chat.isOne2One
                        ? (
                            <TabPane key="profile" label={Lang.string('chat.sidebar.tab.profile.label')}>
                                <ChatSidebarProfile gid={chat.gid} />
                            </TabPane>
                        )
                        : chat.isSystem
                            ? (
                                <TabPane key="recentContacts" label={`${Lang.string('chat.sidebar.tab.recentContacts.label')}`}>
                                    <ChatSidebarSystem chat={chat} />
                                </TabPane>
                            )
                            : (
                                <TabPane key="peoples" label={`${Lang.string('chat.sidebar.tab.peoples.label')}`}>
                                    <ChatSidebarPeoples chat={chat} />
                                </TabPane>
                            )
                }
            </Tabs>
            {children}
        </div>
    );
}

export default memo(ChatSidebar);
