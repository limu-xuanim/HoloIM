import {memo} from 'react';
import {classes} from '~/app/utils/html-helper';
import Avatar, {type AvatarProps} from '~/app/components/avatar';
import Icon from '~/app/components/icon';
import Image from '~/app/components/image';
import Color from '~/app/utils/color';
import MemberAvatar from '../common/member-avatar';
import useChat from './use-chat';
import useLang from '../common/use-lang';
import {renderIf} from '~/app/utils/render';

type ChatAvatarCommonProps = Partial<{
    chat: Chat;
    grayOffline: boolean;
    avatarSize: number;
    iconSize: number;
    avatarClassName: string;
    showNoticeBadge: boolean;
    showStar: boolean;
    isPublic: boolean;
    showStatusDot: boolean;
}> & React.HTMLAttributes<HTMLDivElement>;

/**
 * 通用会话头像组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @param props.chat 会话对象
 * @param props.className 类名
 * @param props.grayOffline 是否将一对一会话对方离线时显示为灰色
 * @param props.avatarSize 头像大小
 * @param props.iconSize 图标大小
 * @param props.avatarClassName 头像类名
 * @param props.showNoticeBadge 是否显示未读通知数徽标
 * @param props.showStar 是否显示已收藏徽标
 * @param props.isPublic 是否公共讨论组
 * @param props.showStatusDot 是否显示状态圆点标记
 * @param props.children 子节点
 * @returns React Node content
 */
export function ChatAvatarCommon(props: ChatAvatarCommonProps) {
    const {
        chat,
        className,
        grayOffline = false,
        avatarSize,
        iconSize,
        avatarClassName,
        showNoticeBadge = true,
        showStar = false,
        isPublic = false,
        children,
        showStatusDot = false,
        ...other
    } = props;
    const [Lang] = useLang();

    if (!chat) {
        return (
            <div className={classes('app-chat-avatar', className)} {...other}>
                <Avatar
                    size={avatarSize}
                    iconSize={iconSize}
                    className={classes('-rounded-full info', avatarClassName)}
                    icon="comment-multiple"
                />
                {children}
            </div>
        );
    }

    const starView = renderIf(showStar && chat.star) && <Icon name="star" className="star" />;

    const noticeBadgeView = renderIf(showNoticeBadge && chat.unreadMessagesCount > 0) && (
        <span className={`label label-xs badge -rounded-full ${chat.isMuteOrHidden ? 'blue' : 'red'}`}>
            {chat.unreadMessagesCount > 99 ? '99+' : chat.unreadMessagesCount}
        </span>
    );

    if (chat.isOne2One) {
        return (
            <div className={classes('app-chat-avatar', className)} {...other}>
                <MemberAvatar
                    className={avatarClassName}
                    memberID={chat.theOtherMemberID}
                    size={avatarSize}
                    showStatusDot={showStatusDot}
                />
                {children}
                {noticeBadgeView}
                {starView}
            </div>
        );
    }

    let defaultColor: string;
    if(chat.isGroup) {
        defaultColor = chat.public ? 'green' : 'blue';
    }
    else if(chat.isSystem) {
        defaultColor = 'blue';
    }

    let avatarClasses = ['-rounded-full', avatarClassName, defaultColor];
    const avatarProps: AvatarProps = {size: avatarSize};
    if (chat.avatar && typeof chat.avatar === 'object') {
        const {type, data} = chat.avatar;
        if (type === 'image') {
            avatarProps.image = <Image src={data?.imgUrl}><Icon name="comment-multiple muted" /></Image>;
            avatarProps.icon = null;
            avatarProps.label = null;
        } else {
            avatarProps.label = data?.customText || Lang.string('common.group', '群');
            if (data?.bgColor) {
                avatarProps.skin = {color: Color.create(data?.bgColor), textColor: '#fff'};
                avatarClasses = avatarClasses.filter(x => x !== defaultColor);
            }
        }
    } else if (isPublic) {
        // 如果手动设置了公共群组为 true，则直接忽略缓存中 chat 对象的参数，直接按照公共群组的情况处理
        // （为了处理当前账号未加入公共群组列表图标显示问题，未加入的公共群组不会存放于缓存）
        avatarProps.label = Lang.string('common.group', '群');
        avatarProps.className = classes('-rounded-full', avatarClassName, 'green');
    } else {
        avatarProps.label = Lang.string('common.group', '群');
    }
    avatarProps.className = classes(avatarClasses);

    return (
        <div className={classes('app-chat-avatar', className)} {...other}>
            <Avatar {...avatarProps} />
            {children}
            {noticeBadgeView}
            {starView}
        </div>
    );
}

type ChatAvatarProps = {gid: string;} & Omit<ChatAvatarCommonProps, 'chat'>;

/**
 * 会话头像组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @param props.gid 会话 GID
 * @param props.className 类名
 * @param props.grayOffline=false 是否将一对一会话对方离线时显示为灰色
 * @param props.avatarSize 头像大小
 * @param props.iconSize 图标大小
 * @param props.avatarClassName 头像类名
 * @param props.showNoticeBadge 是否显示未读通知数徽标
 * @param props.showStar 是否显示已收藏徽标
 * @param props.children 子节点
 * @returns React Node content
 */
function ChatAvatar(props: ChatAvatarProps) {
    const {
        gid,
        children,
        ...others
    } = props;

    const [chat] = useChat(gid);

    return (
        <ChatAvatarCommon chat={chat} {...others}>
            {children}
        </ChatAvatarCommon>
    );
}

export default memo(ChatAvatar);
