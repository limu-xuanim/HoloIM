import React, {type ReactNode, memo} from 'react';
import {classes} from '../../utils/html-helper';
import {isEmptyString} from '../../utils/check-empty';
import useMemberName from './use-member-name';

type MemberNameSpanProps = {
    memberID: number;
    className?: string;
    type?: string;
    children?: ReactNode;
    hideOnLoading?: boolean;
    href?: string;
};

/**
 * 成员名称组件
 * @param props React 组件属性对象
 * @param props.memberID 成员 ID
 * @param props.className 类名
 * @param props.children 子元素内容
 * @param props.hideOnLoading 当没有用户信息时是否隐藏
 * @returns jsx.Element
 */
function MemberNameSpan(props: MemberNameSpanProps) {
    const {
        memberID,
        className,
        children = null,
        hideOnLoading = false,
        type = 'span',
        ...others
    } = props;
    const name = useMemberName(memberID);
    const isEmptyName = isEmptyString(name);
    if (hideOnLoading && isEmptyName) {
        return null;
    }

    return React.createElement(type, {
        className: classes(className, isEmptyName ? '-inline-block loading-holder -relative loading-holder-line' : ''),
        ...others
    }, name, children);
}

export default memo(MemberNameSpan);
