import {memo, useCallback, useMemo, useState} from 'react';
import Avatar from '~/app/components/avatar';
import ErrorBoundary from '~/app/components/error-boundary';
import useWindowSizeType from '~/app/components/hooks/use-window-size-type';
import {SplitPane} from '~/app/components/split-pane/split-pane';
import Config from '~/app/config';
import {activeNextChatOnMenu} from '~/app/core/im/chat-active-state';
import {getLocalConfig} from '~/app/core/local-config';
import {formatDate} from '~/app/utils/date-helper';
import {classes} from '~/app/utils/html-helper';
import useCurrentUser from '../common/use-current-user';
import useLang from '../common/use-lang';
import useUserConfig from '../common/use-user-config';
import ChatBody from './chat-body';
import ChatHeader from './chat-header';
import ChatSendbox from './chat-sendbox';
import ChatSidebar from './chat-sidebar';
import ChatTransfers from './chat-transfers';
import useChat from './use-chat';

type ChatViewProps = {
    chatGid: string;
    onSplitSizeChange: (userID: number, size: number) => void;
    splitSize: number;
} & React.HTMLAttributes<HTMLDivElement> &
    Partial<{hidden: boolean}>;

const getSendboxSize = (userID: number): number =>
    (Config.ui['chat.sendbox.enableSyncSize'] && getLocalConfig(`local.chat.sendbox.height.${userID}`)) ||
    Config.ui['chat.sendbox.height'] ||
    100;

const getBlockTip = (chat: Chat, Lang: LangHelper, dismissedGroupLife: number) => {
    if (chat.isDeletedOne2One) {
        return Lang.string('chat.deletedOne2OneTip');
    }
    if (chat.isNotInGroup) {
        return Lang.string('chat.notInGroupTip');
    }
    if (chat.isDismissed) {
        return Lang.format(
            'chat.group.dismissTip',
            formatDate(chat.getFinalVisibleDate(dismissedGroupLife), Lang.string('time.format.full')),
        );
    }

    return Lang.string('chat.committers.blockedTip');
};

/**
 * 会话视图组件
 * @param props React 组件属性对象
 * @param props.chatGid 会话 GID
 * @param props.hidden 是否隐藏
 * @param props.className] 类名
 * @param props.children 子元素
 * @returns React Node content
 */
function ChatView(props: ChatViewProps) {
    const {chatGid, hidden = false, className, children, splitSize: _splitSize, onSplitSizeChange, ...other} = props;
    const [Lang] = useLang();
    const sizeInfo = useWindowSizeType();
    const [chat] = useChat(chatGid);
    const isChatSidebarShow = useUserConfig(`temp.ui.chat.showSidebar.${chatGid}`);
    const [sidebarWidthType, setSidebarWithType] = useState('');
    const [user] = useCurrentUser();
    const splitSize = _splitSize || getSendboxSize(user.id) || Config.ui['chat.sendbox.height'];

    const handleSidebarWidthChange = useCallback((width: number) => {
        setSidebarWithType(width > 300 ? 'lg' : width < 220 ? 'sm' : '');
    }, []);

    const forceHideSidebar = sizeInfo.isSmallerThanNormal;

    const hideSidebar = forceHideSidebar || Config.ui['chat.hideAllSidebar'] || !isChatSidebarShow;

    const maxHeight = (Config.ui['app.windowMinHeight'] ?? 548) - 100;
    const chatView = useMemo(() => {
        if (!chat) {
            return null;
        }

        const isReadOnly = chat.isReadonly(user);
        if (isReadOnly) {
            const dismissedGroupLife = user?.dismissedGroupLife ?? 90;
            if (chat.isDismissed) {
                // 已解散的讨论组已经超过最后可见日期则不渲染会话界面
                if (!chat.isVisible(dismissedGroupLife)) {
                    activeNextChatOnMenu({lastChatGid: chatGid});
                    return null;
                }
            }

            const blockTip = getBlockTip(chat, Lang, dismissedGroupLife);
            return (
                <div className="column single dock white">
                    <ChatHeader cgid={chatGid} forceHideSidebar={forceHideSidebar} className="-flex-none" />
                    <ChatBody gid={chatGid} className="-flex-auto -relative" />
                    <div className="-flex-none gray text-gray heading">
                        <Avatar icon="lock-outline" />
                        <div className="title">{blockTip}</div>
                    </div>
                </div>
            );
        }

        return (
            <SplitPane
                split="horizontal"
                primary="second"
                maxSize={maxHeight}
                minSize={Config.ui['chat.sendbox.minHeight']}
                size={splitSize}
                onChange={(size) => onSplitSizeChange(user.id, size)}
                paneStyle={{userSelect: 'none'}}
                className="-h-full -w-full"
            >
                <div className="column single dock white">
                    <ChatHeader cgid={chatGid} forceHideSidebar={forceHideSidebar} className="-flex-none" />
                    <ChatBody gid={chatGid} className="-flex-auto -relative" />
                    <ChatTransfers cgid={chatGid} />
                </div>
                <ErrorBoundary>
                    <ChatSendbox className="dock" chat={chat} />
                </ErrorBoundary>
            </SplitPane>
        );
    }, [
        Lang,
        chat,
        chat?.isDeleted,
        chat?.isDismissed,
        chat?.committers,
        chatGid,
        user,
        splitSize,
        onSplitSizeChange,
        forceHideSidebar,
        maxHeight,
    ]);

    if (!chat) {
        return (
            <div key={chatGid} className={classes('box muted', {hidden})}>
                {Lang.string('chats.chat.selectOneOnMenu')}
            </div>
        );
    }

    if (!chatView) {
        return null;
    }

    return (
        <div
            {...other}
            className={classes('app-chat dock', className, `chat-type-${chat.type}`, {
                hidden,
                'chat-readonly': chat.isReadonly(user),
            })}
            id={`chat-view-${chatGid.replace('&', '_')}`}
        >
            <SplitPane
                className="-h-full -w-full"
                split="vertical"
                primary="second"
                maxSize={Math.max(360, Math.min(sizeInfo.width / 2, 360))}
                minSize={175}
                defaultSize={175}
                paneStyle={{userSelect: 'none'}}
                onChange={handleSidebarWidthChange}
            >
                {chatView}
                {hideSidebar ? null : <ChatSidebar className={`is-size-${sidebarWidthType}`} chat={chat} />}
            </SplitPane>
            {children}
        </div>
    );
}

export default memo(ChatView);
