import {type ReactNode, memo} from 'react';
import {classes} from '~/app/utils/html-helper';
import ChatAvatar from './chat-avatar';
import useChat from './use-chat';
import {isEmptyString} from '~/app/utils/check-empty';

type ChatListItemProps = {gid: string;}
    & React.HTMLAttributes<HTMLAnchorElement>
    & Partial<{
        badge: ReactNode;
        grayOffline: boolean;
        showStatusDot: boolean;
    }>;

/**
 * 会话列表项组件
 * @param props React 属性对象
 * @param props.gid 会话 GID
 * @param props.className 类名
 * @param props.badge 自定义的徽标或者设置为 true 来显示默认徽标
 * @param props.grayOffline 是否将离线的一对一会话变灰
 * @param props.showStatusDot 是否显示状态圆点标记
 * @returns JSX.Element
 */
function ChatListItem(props: ChatListItemProps) {
    const {
        gid,
        className,
        badge = null,
        children = null,
        grayOffline = false,
        showStatusDot = false,
        ...others
    } = props;

    const [chat] = useChat(gid);
    if (!chat) {
        return null;
    }

    const {name} = chat;

    return (
        <a
            className={classes('app-chat-item -items-center item', className)}
            title={isEmptyString(name) ? null : name}
            {...others}
        >
            <ChatAvatar showStar={false} gid={gid} avatarClassName="avatar-sm" avatarSize={24} grayOffline={grayOffline} showStatusDot={showStatusDot} className="-flex-none" />
            <div className="title x-text-ellipsis x-text-black">
                {isEmptyString(name) ? <span className="-inline-block loading-holder -relative loading-holder-line">{name}</span> : name}
            </div>
            {badge && <div className="-flex-none" style={{lineHeight: 1}}>{badge}</div>}
            {children}
        </a>
    );
}

export default memo(ChatListItem);
