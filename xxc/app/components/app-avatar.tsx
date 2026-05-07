import React from 'react';
import {classes} from '../utils/html-helper';
import Avatar, {type AvatarProps} from './avatar';

type AppAvatarProps = Partial<{
    avatar: string|JSX.Element|AvatarProps;
    label: React.ReactNode;
    badge: React.ReactNode;
}> & React.HTMLAttributes<HTMLAnchorElement>;

/**
* AppAvatar 组件 ，显示一个应用图标
*/
export default function AppAvatar(props: AppAvatarProps) {
    const {
        avatar,
        label,
        className,
        children,
        badge,
        ...other
    } = props;

    let avatarView: JSX.Element;
    if (React.isValidElement(avatar)) {
        avatarView = avatar;
    } else if (typeof avatar === 'object') {
        avatarView = <Avatar {...avatar} badge={badge} />;
    } else {
        avatarView = <Avatar auto={avatar} badge={badge} />;
    }

    const labelView = React.isValidElement(label)
        ? label
        : <div className="text">{label}</div>;

    return (
        <a className={classes('app-avatar', className)} {...other}>
            {avatarView}
            {labelView}
            {children}
        </a>
    );
}
