import React, {memo} from 'react';
import {classes} from '~/app/utils/html-helper';
import MemberAvatar from './member-avatar';
import useMember from './use-member';

export type MemberListItemProps = {
    memberID: number;
} & Partial<{
    label: React.ReactNode;
    children: React.ReactNode;
    avatarSize: number;
    avatarClassName: string;
}> & React.HTMLAttributes<HTMLAnchorElement>;

/**
 * 成员列表项组件
 * @param props React 属性对象
 * @param props.memberID 成员 ID
 * @param props.title 自定义的标题内容
 * @param props.className 类名
 * @param props.avatarSize 头像大小
 * @param props.avatarClassName 头像类名
 * @returns React 渲染内容
 */
function MemberListItem(props: MemberListItemProps) {
    const {
        memberID,
        label,
        children,
        className = '-items-center',
        avatarSize = 24,
        avatarClassName,
        ...others
    } = props;

    const [member] = useMember(memberID);
    return (
        <a className={classes('app-member-list-item item', className)} title={member.displayName} {...others}>
            <MemberAvatar showStatusDot className={avatarClassName} size={avatarSize} memberID={memberID} />
            <MemberListItemLabel label={label} displayName={member.displayName} />
            {children}
        </a>
    );
}

type MemberListItemLabelProps = {
    label?: React.ReactNode;
    displayName?: string;
};

const MemberListItemLabel = memo(({label, displayName}: MemberListItemLabelProps) => {
    if (React.isValidElement(label)) {
        return label;
    }
    if (label) {
        return <div className="title x-text-ellipsis">{label}</div>;
    }
    if (displayName) {
        return <div className="title x-text-ellipsis">{displayName}</div>;
    }
    return <div className="title -relative loading-holder loading-holder-line" />;
});

export default memo(MemberListItem);
