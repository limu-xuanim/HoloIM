import React from 'react';
import {classes} from '../utils/html-helper';
import Icon, {type IconProps} from './icon';
import Avatar, {type AvatarProps} from './avatar';

function HeadingIcon(props: {icon: string|React.ReactElement|IconProps;}) {
    const {icon} = props;
    if (!icon) {
        return null;
    }

    if (React.isValidElement(icon)) {
        return icon;
    }

    if (typeof icon === 'object') {
        return <Icon {...(icon as IconProps)} />;
    }

    return <Icon name={icon} />;
}

function HeadingAvatar(props: {avatar: true|React.ReactElement|AvatarProps|string; icon: string|React.ReactElement;}) {
    const {avatar, icon} = props;
    if (!avatar) {
        return null;
    }

    if (avatar === true && icon) {
        return <Avatar icon={icon} />;
    }

    if (React.isValidElement(avatar)) {
        return avatar;
    }

    if (typeof avatar === 'object') {
        return <Avatar {...avatar} />;
    }

    if (avatar) {
        return <Avatar auto={avatar as string} />;
    }
}

function HeadingTitle(props: {title: React.ReactNode;}) {
    const {title} = props;
    if (!title) {
        return null;
    }

    if (React.isValidElement(title)) {
        return title;
    }

    return <div className="title">{title}</div>;
}

type HeadingProps = React.Attributes
    & Partial<{
        type: string;
        className: string;
        nav: React.ReactNode;
        avatar: true|React.ReactElement|AvatarProps|string;
        icon: string|React.ReactElement;
        title: React.ReactNode;
        children: React.ReactNode;
    }>;

/**
 * Heading 组件 ，显示一个支持带头像或操作的标题
 */
export default function Heading(props: HeadingProps) {
    const {
        type = 'a',
        nav,
        avatar,
        icon,
        title,
        children,
        className,
        ...other
    } = props;

    return React.createElement(
        type,
        {
            className: classes('app-heading', className),
            ...other
        },
        <HeadingAvatar avatar={avatar} icon={icon} />,
        <HeadingIcon icon={icon} />,
        <HeadingTitle title={title} />,
        nav,
        children
    );
}
