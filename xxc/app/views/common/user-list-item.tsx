import {classes} from '../../utils/html-helper';
import MemberAvatarCommon from './member-avatar-common';

type UserListItemProps = React.HTMLAttributes<HTMLAnchorElement>
    & {user: User;}
    & Partial<{
        className: Parameters<typeof classes>[0];
        avatarSize: number;
        avatarClassName: string;
    }>;

/**
 * UserListItem 组件 ，显示用户列表条目界面
 */
export default function UserListItem(props: UserListItemProps) {
    const {
        className = '-items-center',
        avatarSize = 30,
        avatarClassName,
        user,
        children,
        ...other
    } = props;

    return (
        <a className={classes('app-user-list-item item', className)} {...other}>
            <MemberAvatarCommon
                className={avatarClassName}
                size={avatarSize}
                code={user.account}
                avatar={user.avatar}
                displayName={user.displayName}
            />
            <div className="content">
                <div className="title">{user.displayName} <small className="muted">@{user.account}</small></div>
                <div className="subtitle">{user.serverUrl}</div>
            </div>
            {children}
        </a>
    );
}
