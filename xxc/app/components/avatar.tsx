import React, {memo} from 'react';
import {rem, classes, type ClassLike} from '../utils/html-helper';
import Skin, {type SkinStyleOptions} from '../utils/skin';
import Icon from './icon';
import Image from './image';
import {emojiToImage} from './emoji';
import {isWideCharacter, getAsciiWidth} from '../utils/string-helper';

/**
 * 创建一个头像组件
 * @param avatar 头像内容
 * @param iconView 图标内容
 * @returns 组件
 */
export function renderAvatar(avatar: true|string|React.ReactElement|AvatarProps, iconView?: string|React.ReactElement) {
    if (avatar === true && iconView) {
        return <Avatar icon={iconView} />;
    }
    if (React.isValidElement(avatar)) {
        return avatar;
    }
    if (typeof avatar === 'object') {
        return <Avatar {...avatar} />;
    }
    if (typeof avatar === 'string') {
        return <Avatar auto={avatar} />;
    }
    return null;
}

export type AvatarProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'className'>
    & Partial<{
        auto: string|React.ReactElement;
        skin: string|number|SkinStyleOptions;
        image: string|React.ReactElement;
        icon: string|React.ReactElement|null;
        label: string|React.ReactElement;
        size: number;
        iconSize: number;
        className: ClassLike;
        foreColor: string;
        imageClassName: string;
        iconClassName: string;
        badge: React.ReactNode;
        imageErrorView: false|React.ReactElement;
    }>;

const getComputedStyle = (style: React.CSSProperties, skin: string|number|SkinStyleOptions, size: number, foreColor: string) => {
    style = Object.assign(skin ? Skin.style(skin as SkinStyleOptions) : {}, style);
    if (size) {
        style.width = rem(size);
        style.height = style.width;
    }

    if (foreColor) {
        style.color = foreColor;
    }

    return style;
};

type AvatarImageProps = {
    image: AvatarProps['image'];
    className: AvatarProps['imageClassName'];
    imageErrorView: AvatarProps['imageErrorView'];
};
const AvatarImage = memo((props: AvatarImageProps) => {
    const {image, className, imageErrorView} = props;
    if (!image) {
        return null;
    }
    if (React.isValidElement(image)) {
        return image;
    }
    return (
        <Image
            alt={image as string}
            src={image as string}
            className={className}
        >
            {imageErrorView !== false ? (imageErrorView || <Icon name="image-filter-hdr muted" />) : undefined}
        </Image>
    );
});

type AvatarIconProps = {
    image: AvatarProps['image'];
    icon: AvatarProps['icon'];
    className: AvatarProps['iconClassName'];
    size: AvatarProps['iconSize'];
};
const AvatarIcon = memo((props: AvatarIconProps) => {
    const {image, icon, className, size} = props;
    if (image || !icon) {
        return null;
    }
    if (React.isValidElement(icon)) {
        return icon;
    }
    return <Icon className={className} name={icon as string} size={size} />;
});

const AvatarLabel = memo((props: Pick<AvatarProps, 'image' | 'icon' | 'label' | 'size'>) => {
    const {image, icon, label, size} = props;

    if (image || icon || !label) {
        return null;
    }
    if (React.isValidElement(label)) {
        return label;
    }
    if ((label as string).trim().length <= 1) {
        return <span className="text" style={size ? {fontSize: rem(size / 2)} : {}}>{label}</span>;
    }
    const labelText = (label as string).trim();
    const labelElements = labelText.match(/(?::[\w\d_]+:)|\S/g);
    const labelWords = labelText.match(/(?:(?: |\n)(?:\w+)|(?: |\n)(?::[\w\d_]+:))/g);

    const asciiWidth = getAsciiWidth(labelText);
    const charCount = labelElements.length;
    const wordCount = labelWords ? labelWords.length + 1 : 1;
    const wideCharCount = labelElements.filter(item => (item.length > 2 && item.startsWith(':')) || (item.length === 1 && isWideCharacter(item))).length;

    let crowdness = 0;
    if (wideCharCount >= 3 || charCount > 6 || (charCount > 2 && wordCount > 1)) {
        crowdness = 2;
    } else if (charCount > 1 && ((wideCharCount > 1 || charCount > 3 || (charCount === 3 && asciiWidth >= 90)))) {
        crowdness = 1;
    }

    let fontSize = 0;
    if (size) {
        fontSize = size / 2;
        if (crowdness === 1) {
            fontSize *= 0.85;
        } else if (crowdness === 2) {
            fontSize *= 0.65;
        }
    }

    const labelContent = `<span>${(label as string).replace(/(:[\w\d_]+:)/g, '</span>$1<span>')}</span>`.replace(/<span> *<\/span>/g, '');
    return <span
        className={classes('text', `crowd-${crowdness}`)}
        style={size ? {fontSize: rem(Math.round(fontSize))} : {}}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
        dangerouslySetInnerHTML={{__html: emojiToImage(labelContent)}}
    />;
});

const AvatarBadge = memo((props: Pick<AvatarProps, 'badge'>) => {
    const {badge} = props;
    if (!badge) {
        return null;
    }
    if (React.isValidElement(badge)) {
        return badge;
    }
    return <div className="label label-sm dock-right dock-top -rounded-full red badge">{badge}</div>;
});

/**
 * Avatar 组件 ，显示一个头像
 * @param props React 组件属性对象
 * @param props.auto auto
 * @param props.skin 皮肤
 * @param props.image 图片
 * @param props.icon 图标
 * @param props.label 标签
 * @param props.size 大小
 * @param props.iconSize 图标大小
 * @param props.className 样式类名
 * @param props.foreColor 强制颜色
 * @param props.imageClassName 图片样式类名
 * @param props.iconClassName 图标样式类名
 * @param props.style 样式
 * @param props.children 子组件
 * @param props.badge 徽章
 * @param props.imageErrorView 图片错误内容
 * @returns 组件
 */
function Avatar(props: AvatarProps) {
    let {
        image,
        icon,
        label,
        style,
        auto,
        skin,
        size,
        className,
        foreColor,
        imageClassName,
        imageErrorView,
        iconClassName,
        children,
        iconSize,
        badge,
        ...other
    } = props;

    style = getComputedStyle(style, skin, size, foreColor);

    if (auto) {
        if (typeof auto === 'string') {
            if (/^(icon|mdi|sprite)-/.test(auto)) {
                icon = auto;
            } else if (auto.length === 1) {
                label = auto;
            } else {
                image = auto;
            }
        } else {
            icon = auto;
        }
    }

    return (
        <div
            className={classes('avatar', className, {'with-badge': !!badge})}
            style={style}
            {...other}
        >
            <AvatarImage image={image} className={imageClassName} imageErrorView={imageErrorView} />
            <AvatarIcon image={image} icon={icon} className={iconClassName} size={iconSize} />
            <AvatarLabel image={image} icon={icon} label={label} size={size} />
            <AvatarBadge badge={badge} />
            {children}
        </div>
    );
}

export default memo(Avatar);
