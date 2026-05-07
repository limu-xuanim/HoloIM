import React, {memo} from 'react';
import {classes} from '../utils/html-helper';
import Skin from '../utils/skin';
import {renderIcon} from './icon';

type ReactNodeLike = import('prop-types').ReactNodeLike;
type IconProps = import('./icon').IconProps;

type CommonButtonProps = Partial<{
    skin: number|string;
    className: string;
    btnClass: string;
    iconPosition: 'left'|'right';
    disabled: boolean;
    icon: string|JSX.Element|IconProps;
    label: ReactNodeLike;
    hoverLabel: ReactNodeLike;
    children: ReactNodeLike;
    style: React.CSSProperties;
}>;

type AnchorButtonProps = CommonButtonProps
    & Partial<{onClick: React.MouseEventHandler<HTMLAnchorElement>;}>
    & React.HTMLAttributes<HTMLAnchorElement>
    & Partial<{
        type: 'a';
        url: string;
    }>;

type ButtonProps = CommonButtonProps
    & React.HTMLAttributes<HTMLButtonElement>
    & Partial<{
        type: 'button'|'submit'|'reset';
        onClick: React.MouseEventHandler<HTMLButtonElement>;
    }>;

const getIconView = (icon: CommonButtonProps['icon']) => {
    if (!icon) {
        return null;
    }

    if (React.isValidElement(icon)) {
        return icon;
    }

    return renderIcon(icon as any);
};

const getLabelViews = (label: CommonButtonProps['label'], hoverLabel: CommonButtonProps['hoverLabel']) => {
    const labelView = label
        ? React.isValidElement(label)
            ? label
            : <span className="text">{label}</span>
        : null;
    const hoverLabelView = hoverLabel
        ? <span className="text for-hover">{hoverLabel}</span>
        : null;
    return [labelView, hoverLabelView];
};

/**
 * Button 组件 ，显示一个按钮
 * @param props React 组件属性对象
 * @param props.skin 皮肤
 * @param props.icon 图标
 * @param props.label 标签
 * @param props.iconPosition 图标位置
 * @param props.hoverLabel 鼠标悬停标签
 * @param props.className 样式类名
 * @param props.style 样式
 * @param props.children 子组件
 * @param props.btnClass 按钮类名
 * @param props.type 类型
 * @param props.url 链接
 * @param props.disabled 禁用
 * @param props.onClick 点击事件
 * @returns React Node
 */
function Button(props: AnchorButtonProps|ButtonProps) {
    const {
        skin,
        icon,
        label,
        iconPosition = 'left',
        hoverLabel,
        className = '',
        children,
        style,
        type = 'button',
        btnClass = 'btn',
        disabled = false,
        onClick,
        ...other
    } = props;

    const iconView = getIconView(icon);
    const [labelView, hoverLabelView] = getLabelViews(label, hoverLabel);
    const buttonStyle = Object.assign(skin ? Skin.style(skin) : {}, style);
    const buttonClassName = classes(btnClass, disabled ? 'disabled' : null, className, {'btn-icon': !labelView && !children, 'has-hover-text': !!hoverLabelView});

    if (type === 'a' || 'url' in props) {
        return (
            <a
                href={(props as AnchorButtonProps).url}
                onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
                style={buttonStyle}
                className={buttonClassName}
                {...other as React.HTMLAttributes<HTMLAnchorElement>}
            >
                {iconPosition === 'left' ? iconView : null}{labelView}{hoverLabelView}{iconPosition === 'right' ? iconView : null}{children}
            </a>
        );
    }
    return (
        <button
            type={type}
            className={buttonClassName}
            style={buttonStyle}
            onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
            {...other as React.HTMLAttributes<HTMLButtonElement>}
        >
            {iconPosition === 'left' ? iconView : null}{labelView}{hoverLabelView}{iconPosition === 'right' ? iconView : null}{children}
        </button>
    );
}

export default memo(Button);
