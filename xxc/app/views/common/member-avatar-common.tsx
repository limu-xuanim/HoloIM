import {memo} from 'react';
import Avatar, {type AvatarProps} from '~/app/components/avatar';
import Icon from '~/app/components/icon';
import Image from '~/app/components/image';
import StatusDot from './status-dot';
import {getMemberAvatar} from '~/app/core/members/member-helper';
import {isMemberOffline, type MemberStatusName} from '~/app/core/members/member';
import type {ClassLike} from '~/app/utils/html-helper';
import {isNotEmptyString} from '~/app/utils/check-empty';

/**
 * 创建 Avatar 组件属性对象
 * @param status 成员状态名称
 * @param displayName 成员显示名称
 * @param avatar 成员头像定义
 * @param props 其他属性
 * @returns 组件属性对象
 */
export function createAvatarPropsFromMember(
    status: MemberStatusName,
    displayName: string | Nullish,
    avatar: string | Nullish,
    props: Omit<CommonMemberAvatarProps, 'status' | 'displayName' | 'avatar'> & Pick<AvatarProps, 'onClick' | 'onContextMenu'>
): AvatarProps {
    const {
        className,
        showStatusDot,
        size,
        code,
        shape,
        grayOffline,
        onClick,
        onContextMenu,
    } = props;

    const avatarProps: AvatarProps = {
        size,
        icon: 'account',
        iconSize: 2,
        className: ['user-avatar', shape, className],
        onClick,
        onContextMenu,
    };

    if (grayOffline && isMemberOffline(status)) {
        (avatarProps.className as string[]).push('grayscale');
    }

    if (showStatusDot) {
        const bottom = (size * 0.1464 - 7) + 'px';
        const right = bottom;
        avatarProps.badge = <StatusDot className="-absolute -block" status={status} style={{bottom, right}} />;
    }

    if (avatar) {
        const avatarUrl = getMemberAvatar(avatar);
        if (avatarUrl) {
            if (avatarUrl.startsWith('icon-') || avatarUrl.startsWith('mdi-')) {
                avatarProps.skin = {code: code, textColor: 'white'};
                avatarProps.icon = avatarUrl;
            } else {
                avatarProps.image = <Image src={avatarUrl}><Icon name="account muted" /></Image>;
                avatarProps.imageClassName = '-rounded-full';
                avatarProps.icon = null;
            }
            return avatarProps;
        }
    }

    if (isNotEmptyString(displayName)) {
        avatarProps.skin = {code: code, textColor: 'white'};
        avatarProps.label = displayName[0].toUpperCase();
        avatarProps.icon = null;
        return avatarProps;
    }
    avatarProps.skin = {code: code, textColor: 'white'};
    (avatarProps.className as string[]).push('loading-holder');

    return avatarProps;
}

type CommonMemberAvatarProps = {
    size: number;
} & Partial<{
    status: MemberStatusName;
    className: ClassLike | Nullish;
    displayName: string;
    avatar: string;
    code: number | string;
    shape: string;
    showStatusDot: boolean;
    grayOffline: boolean;
}> & React.HTMLAttributes<HTMLDivElement>;

const CommonMemberAvatarDefaultProps = Object.freeze({
    shape: '-rounded-full',
    showStatusDot: false,
    size: 24,
    grayOffline: false,
});

const MemberAvatarCommon = memo((props: CommonMemberAvatarProps) => {
    const {
        status,
        displayName,
        avatar,
        ...otherProps
    } = {...CommonMemberAvatarDefaultProps, ...props};
    return <Avatar {...createAvatarPropsFromMember(status ?? 'unverified', displayName, avatar, otherProps)} />;
});

export default MemberAvatarCommon;
