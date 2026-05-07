import React from 'react';
import {classes} from '../utils/html-helper';
import {renderIcon} from './icon';
import {type AvatarProps, renderAvatar} from './avatar';

type ListItemProps = Partial<{
    avatar: true|string|React.ReactElement|AvatarProps;
    icon: string;
    title: React.ReactNode;
    subtitle: React.ReactNode;
    actions: React.ReactNode;
    divider: boolean;
}> & Omit<React.HTMLAttributes<HTMLAnchorElement>, 'title'>;

/**
 * ListItem 组件 ，显示一个列表项
 * @param props Reat 组件属性对象
 * @returns React 渲染内容
 */
export default function ListItem(props: ListItemProps) {
    const {
        avatar,
        icon,
        title,
        subtitle,
        children,
        actions,
        divider = false,
        className,
        ...other
    } = props;

    const iconView = renderIcon(icon);
    const avatarView = renderAvatar(avatar, iconView);

    let titleView: React.ReactNode;
    if (title) {
        if (React.isValidElement(title)) {
            titleView = title;
        } else if (title) {
            titleView = <div className="title">{title}</div>;
        }
    }
    let subtitleView: React.ReactNode;
    if (subtitle) {
        if (React.isValidElement(subtitle)) {
            subtitleView = subtitle;
        } else if (subtitle) {
            subtitleView = <div className="subtitle -truncate" title={subtitle}>{subtitle}</div>;
        }
    }
    const multiLines = subtitleView || children;
    const contentView = multiLines
        ? (
            <div className="content -truncate">
                {titleView}
                {subtitleView}
                {children}
            </div>
        )
        : titleView;
    return (
        <a
            className={classes(
                'app-list-item item',
                className,
                {divider, 'with-avatar': Boolean(avatarView), 'multi-lines': Boolean(multiLines)}
            )}
            {...other}
        >
            {avatarView}
            {iconView}
            {contentView}
            {actions}
        </a>
    );
}
