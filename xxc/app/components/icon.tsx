import React from 'react';
import {classes, rem} from '../utils/html-helper';

/**
 * 渲染一个图标
 * @param icon 图标名称
 * @param props Icon 属性
 * @param props.square 是否强制图标占据的空间长宽一致
 * @param props.size 图标大小
 * @param props.color 图标颜色
 * @param props.style 图标样式
 * @param props.children 内部内容
 * @param props.className 类名
 * @returns React Node
 */
export function renderIcon(icon: string, props?: Omit<IconProps, 'name'>): JSX.Element;

/**
 * 渲染一个图标
 * @param icon 图标属性
 * @param props 图标 属性
 * @param props.square 是否强制图标占据的空间长宽一致
 * @param props.size 图标大小
 * @param props.color 图标颜色
 * @param props.style 图标样式
 * @param props.children 内部内容
 * @param props.className 类名
 * @returns React Node
 */
export function renderIcon(props: IconProps): JSX.Element;

export function renderIcon(icon: IconProps|string|React.ReactElement, props: Omit<IconProps, 'name'> = {}) {
    if (React.isValidElement(icon)) {
        return icon;
    }

    if (typeof icon === 'object') {
        return <Icon {...icon as IconProps} />;
    }

    if (typeof icon === 'string') {
        return <Icon name={icon} {...props} />;
    }

    return null;
}

const getIconName = (name: string) => {
    if (name.startsWith('mdi-')) {
        return `mdi ${name}`;
    }
    if (name.startsWith('icon-')) {
        return name;
    }
    if (name.startsWith('sprite-')) {
        return `${name} icon-sprite`;
    }
    return `mdi mdi-${name}`;
};

const getComputedStyle = (
    style: React.CSSProperties,
    size: number,
    color: React.CSSProperties['color'],
    square: boolean
) => {
    const computedStyle = {...style};
    if (size) {
        computedStyle.fontSize = rem(size < 12 ? size * 12 : size);
    }
    if (color) {
        computedStyle.color = color;
    }
    if (square && size) {
        computedStyle.lineHeight = computedStyle.fontSize;
        computedStyle.height = computedStyle.fontSize;
        computedStyle.width = computedStyle.fontSize;
    }
    return computedStyle;
};

export type IconProps = React.HTMLAttributes<HTMLElement>
    & {name: string;}
    & Partial<{
        size: number;
        square: boolean;
        color: React.CSSProperties['color'];
    }>;

/**
 * 图标组件
 * @param props React 组件属性对象
 * @param props.square 是否强制图标占据的空间长宽一致
 * @param props.size 图标大小
 * @param props.color 图标颜色
 * @param props.name 图标名称
 * @param props.style 图标样式
 * @param props.children 内部内容
 * @param props.className 类名
 * @returns 组件
 */
export default function Icon(props: IconProps) {
    const {
        square = true,
        size = 0,
        color = '',
        name = '',
        style = {},
        className = '',
        ...other
    } = props;

    const computedStyle = getComputedStyle(style, size, color, square);
    const iconName = getIconName(name);

    return (
        <i
            style={computedStyle}
            className={classes(`icon ${iconName}`, className)}
            {...other}
        />
    );
}
