import {memo, useEffect, useRef} from 'react';
import {Link} from 'react-router-dom';
import {classes} from '~/app/utils/html-helper';
import {isNotEmptyString} from '~/app/utils/check-empty';
import Icon from '~/app/components/icon';
import {onSwapUser} from '~/app/core/profile';
import ROUTES from '~/app/views/common/routes';
import useLang from '~/app/views/common/use-lang';
import useInterval from '~/app/components/hooks/use-interval';
import membersStore from '~/app/core/members/members-store';
import {isRoutePathMatch} from '~/app/core/ui/router';
import platform from '~/app/platform';
import useChatUnreadMessagesCount from '../use-chat-unread-messages-count';
import {renderIf} from '~/app/utils/render';
import MenuChatAvatar from './menu-chat-avatar';
import MenuChatTitle from './menu-chat-title';
import MenuChatSubtitle from './menu-chat-subtitle';
import {ChatMenuType} from '~/app/constants';
import useChat from '../use-chat';
import useCurrentUser from '~/app/views/common/use-current-user';

/**
 * 检查会话对象信息是否完整
 * @param chat 会话对象
 * @returns 如果为 true 表示信息完整
 */
function checkIsChatInfoComplete(chat: Chat) {
    if (chat.isOne2One) {
        const theOtherMember = membersStore.getMember(chat.theOtherMemberID);
        return isNotEmptyString(chat.name) && theOtherMember;
    }

    return true;
}

export type MenuChatListItemProps = {gid: string;}
    & React.HTMLAttributes<HTMLAnchorElement>
    & Partial<{
        filter: ValueOf<typeof ChatMenuType>;
        showAvatar: boolean;
        hideOnLoading: boolean;
    }>;

/**
 * 会话列表项组件
 * @param props React 组件属性对象
 * @param props.gid 会话 GID
 * @param props.filter 列表类型
 * @param props.className 类名
 * @param props.children 子节点
 * @param props.showAvatar 是否显示头像
 * @param props.hideOnLoading 是否在加载时隐藏
 * @returns React Node content
 */
function MenuChatListItem(props: MenuChatListItemProps) {
    const {
        gid,
        className,
        children = null,
        filter = ChatMenuType.recents,
        showAvatar = true,
        hideOnLoading = false,
        ...other
    } = props;

    const [chat] = useChat(gid);
    const chatUnreadMessagesCount = useChatUnreadMessagesCount(gid);
    const [Lang] = useLang();
    const isChatInfoRequired = useRef(hideOnLoading);
    const [currentUser] = useCurrentUser();
    const draft = chat?.draft;
    let isDraftActive = !!draft;


    // TODO(catouse): 尝试根据会话 lastActiveTime 指定自动更新间隔来提升性能
    useInterval();

    useEffect(() => {
        if (!hideOnLoading) {
            return;
        }

        // TODO: 每个会话列表项都绑定此事件，代价有点大，后面想办法优化
        const subscription = onSwapUser(() => {
            isChatInfoRequired.current = true;
        });

        return () => subscription.unsubscribe();
    }, [hideOnLoading]);

    if (!chat || !currentUser) {
        return null;
    }

    if (isChatInfoRequired.current) {
        const isComplete = checkIsChatInfoComplete(chat);
        isChatInfoRequired.current = !isComplete;
        if (!isComplete) {
            return null;
        }
    }

    let unreadMessagesCount = chatUnreadMessagesCount;

    // 如果窗口激活并且处于当前会话界面则不显示未读数目和草稿
    if (isRoutePathMatch('chats', '*', gid)) {
        isDraftActive = false;
        if (unreadMessagesCount && platform.call('ui.isWindowFocus')) {
            unreadMessagesCount = 0;
        }
    }

    const avatarView = <MenuChatAvatar showAvatar={showAvatar} chat={chat} />;

    if (isDraftActive) {
        return (
            <Link
                to={ROUTES.chats.chat.id(chat.gid, filter)}
                className={classes('app-menu-chat-item -items-center', className, {
                    'with-avatar': showAvatar,
                    star: chat.star,
                })}
                draggable={false}
                {...other}
            >
                {avatarView}
                <div className="content">
                    <MenuChatTitle chat={chat} unreadMessagesCount={unreadMessagesCount} showAvatar={showAvatar} />
                    <div className="subtitle -flex -justify-between -items-center">
                        <div className="text-draft x-text-ellipsis">
                            <span className="draft-label">{Lang.string('common.draft')}: </span>{draft}
                        </div>
                        {renderIf(chat.star) && <Icon name="pin" size={12} className="star-icon" />}
                    </div>
                </div>
                {children}
            </Link>
        );
    }

    return (
        <Link
            to={ROUTES.chats.chat.id(chat.gid, filter)}
            className={classes('app-menu-chat-item -items-center', className, {
                'with-avatar': showAvatar,
                'multi-lines': true,
                star: chat.star,
            })}
            draggable={false}
            {...other}
        >
            {avatarView}
            <div className="content">
                <MenuChatTitle chat={chat} unreadMessagesCount={unreadMessagesCount} showAvatar={showAvatar} />
                <MenuChatSubtitle chat={chat} currentUser={currentUser} unreadMessagesCount={unreadMessagesCount} hideOnLoading={hideOnLoading} Lang={Lang} />
            </div>
            {children}
        </Link>
    );
}


export default memo(MenuChatListItem);
